// src/server/plugin.ts
// -----------------------------------------------------------------------------
// @neomodul/neoai server plugin — P0 foundation.
//
//   * Collections (workflows/versions/functions/runs/steps/settings) through
//     the Collection Manager (ensureCollection/ensureField, CRM pattern).
//   * `neoai` resource: run / runStatus / resumeRun / cancelRun /
//     publishWorkflow / getSettings / saveSettings / ping — ALL admin-gated
//     (owner: "admin only for now").
//   * Tree runner execution: runs start via setImmediate (request returns the
//     run id immediately), every node materialises a neoai_run_steps row, the
//     run row carries totals (tokens/cost) + suspended state for human gates.
//   * In-process service for host plugins (function registry + dispatch):
//       const neoai = app.pm.get('neoai');
//       await neoai.registerFunction({ key, title, plugin, ... });
//       const r = await neoai.runFunction('crm.draftReply', input, { user });
//     — returns null when no workflow is bound (caller keeps its legacy path).
//
// RESILIENCE: setup() runs on install AND afterEnable (idempotent). Menu links
// and seeds are best-effort. On app start, runs stuck in 'running' (process
// died mid-run) are marked failed — 'waiting' runs survive restarts by design.

import { Plugin } from '@nocobase/server';
import { MENU_LINKS, NEOAI_COLLECTIONS, NEOAI_EXTRA_FIELDS } from './collections';
import { isAdminCtx, isSandbox } from './lib/env';
import { DEFAULT_IMAGE_PRICE_USD, DEFAULT_PRICES, checkBudget } from './lib/cost';
import { execLeafFactory } from './lib/nodes';
import { Runner, RunOutcome, StepEvent, WorkflowDef, validateDefinition } from './lib/runner';
import { isDue, parseSchedule } from './lib/schedule';
import { decryptSecret, encryptSecret } from './lib/secrets';
import { resolveTemplates, truncateJson } from './lib/template';
import { ensureSeedWorkflows } from './seed';

/** Count budget-relevant nodes for the confirm-gate estimate. */
function countModelNodes(def: WorkflowDef): { llm: number; image: number } {
  const out = { llm: 0, image: 0 };
  const walk = (nodes: any[]) => {
    for (const n of nodes ?? []) {
      if (n.type === 'llm') out.llm += 1;
      if (n.type === 'image') out.image += 1;
      // agent (item 20): each turn's decide step is itself an llm call —
      // worst-case estimate is its (client-capped) maxTurns, since the exact
      // turn count is only known once the model starts deciding to finish.
      if (n.type === 'agent') out.llm += Math.max(1, Math.min(Number(n.config?.maxTurns) || 25, 25));
      for (const b of n.branches ?? []) walk(b ?? []);
    }
  };
  walk(def?.nodes ?? []);
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

type RunHandle = { cancelled: boolean; workflowId?: number };

export class NeoaiPlugin extends Plugin {
  private running = new Map<number, RunHandle>();
  private schedulerTimer: any = null;

  async install() {
    await this.setup();
  }

  async afterEnable() {
    await this.setup();
  }

  async load() {
    // Settings-page gate (client pluginSettingsManager aclSnippet must match).
    this.app.acl.registerSnippet({ name: 'pm.neoai.settings', actions: ['neoai:*'] });
    // Actions are reachable for logged-in users at the ACL layer, but EVERY
    // handler re-gates on admin/root (defense in depth; collections stay
    // internal-by-default under native ACL anyway).
    this.app.acl.allow('neoai', '*', 'loggedIn');

    const requireAdmin = (ctx: any) => {
      if (!isAdminCtx(ctx)) ctx.throw(403, 'NeoAI is admin-only for now');
    };

    this.app.resourceManager.define({
      name: 'neoai',
      actions: {
        ping: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const names = NEOAI_COLLECTIONS.map((c) => c.name);
          const settingsRow = await this.settingsRow();
          ctx.body = {
            ok: true,
            plugin: pkg.name,
            version: pkg.version,
            sandbox: isSandbox(),
            forceMock: settingsRow?.get?.('force_mock') === true,
            collections: names.filter((n) => !!this.db.getCollection(n)),
            pluginAi: !!(this.app.pm?.get?.('ai') as any)?.aiManager,
          };
          await next();
        },

        run: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.startRun({
            workflowId: p.workflowId,
            workflowKey: p.workflowKey,
            functionKey: p.functionKey,
            input: p.input ?? {},
            draft: p.draft === true,
            confirmed: p.confirmed === true,
            trigger: String(p.trigger ?? 'manual'),
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? 'admin'),
            skipToNodeId: p.skipToNodeId,
            seedVars: p.seedVars,
          });
          await next();
        },

        runStatus: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = { ...(ctx.action.params.values ?? {}), ...(ctx.action.params ?? {}) };
          const runId = Number(p.runId);
          const run = await this.db.getRepository('neoai_runs').findOne({ filterByTk: runId });
          if (!run) ctx.throw(404, `run ${runId} not found`);
          const steps = await this.db.getRepository('neoai_run_steps').find({
            filter: { run_id: runId },
            sort: ['seq'],
            limit: 500,
          });
          ctx.body = { run: run.toJSON(), steps: steps.map((s: any) => s.toJSON()) };
          await next();
        },

        cancelRun: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const runId = Number(ctx.action.params.values?.runId);
          const repo = this.db.getRepository('neoai_runs');
          const run = await repo.findOne({ filterByTk: runId });
          if (!run) ctx.throw(404, `run ${runId} not found`);
          const handle = this.running.get(runId);
          if (handle) handle.cancelled = true;
          if (run.get('status') === 'waiting' || (!handle && run.get('status') === 'running')) {
            await repo.update({
              filterByTk: runId,
              values: { status: 'cancelled', finished_at: new Date(), state: null },
            });
          }
          ctx.body = { ok: true };
          await next();
        },

        resumeRun: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const runId = Number(p.runId);
          const approved = p.approved === true;
          const comment = String(p.comment ?? '');
          ctx.body = await this.resumeRun(runId, {
            approved,
            comment,
            by: String(ctx.state?.currentUser?.nickname ?? 'admin'),
          });
          await next();
        },

        rerunRun: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.rerunRun(Number(p.runId), p.newInput ?? {}, {
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? 'admin'),
          });
          await next();
        },

        batchRun: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.batchRun({
            workflowId: p.workflowId,
            workflowKey: p.workflowKey,
            items: p.items ?? [],
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? 'admin'),
          });
          await next();
        },

        publishWorkflow: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const wfRepo = this.db.getRepository('neoai_workflows');
          const wf = await wfRepo.findOne({ filterByTk: Number(p.workflowId) });
          if (!wf) ctx.throw(404, 'workflow not found');
          const def = (wf.get('definition_draft') ?? {}) as WorkflowDef;
          const errors = validateDefinition(def);
          // dryRun: live-editing validation only — never creates a version or
          // bumps current_version, just reports the same errors publish would.
          if (errors.length || p.dryRun === true) {
            ctx.body = { ok: errors.length === 0, errors };
            return next();
          }
          const version = Number(wf.get('current_version') ?? 0) + 1;
          await this.db.getRepository('neoai_workflow_versions').create({
            values: {
              workflow_id: wf.get('id'),
              version,
              definition: def,
              published_by: String(ctx.state?.currentUser?.nickname ?? 'admin'),
              notes: String(p.notes ?? ''),
            },
          });
          await wfRepo.update({ filterByTk: wf.get('id'), values: { current_version: version } });
          ctx.body = { ok: true, version };
          await next();
        },

        getSettings: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const s = await this.settingsRow();
          const j = s?.toJSON?.() ?? {};
          delete j.gemini_api_key;
          ctx.body = {
            ...j,
            geminiKeyConfigured: !!(process.env.GEMINI_API_KEY || s?.get?.('gemini_api_key')),
            geminiKeyFromEnv: !!process.env.GEMINI_API_KEY,
          };
          await next();
        },

        saveSettings: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = { ...(ctx.action.params.values ?? {}) };
          const repo = this.db.getRepository('neoai_settings');
          const row = await this.settingsRow();
          const values: any = {};
          for (const k of ['default_llm_service', 'default_model', 'daily_budget_usd', 'image_price_usd', 'prices', 'force_mock', 'spend_alert_pct']) {
            if (p[k] !== undefined) values[k] = p[k];
          }
          // Key is write-only: set when a non-empty string arrives, clear on ''.
          if (typeof p.gemini_api_key === 'string') values.gemini_api_key = p.gemini_api_key.trim();
          if (row) await repo.update({ filterByTk: row.get('id'), values });
          else await repo.create({ values });
          ctx.body = { ok: true };
          await next();
        },

        spendToday: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          ctx.body = { global: await this.spentTodayUsd(), byWorkflow: await this.spentTodayByWorkflow() };
          await next();
        },

        spendTrend: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          ctx.body = await this.spendTrend();
          await next();
        },

        // HTTP surface of the in-process function dispatch — used by the
        // console's Functions panel and by E2E; host plugins call the service
        // method directly instead.
        runFunction: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const res = await this.runFunction(String(p.functionKey ?? ''), p.input ?? {}, {
            triggeredBy: String(ctx.state?.currentUser?.nickname ?? 'admin'),
            wait: p.wait === true,
          });
          ctx.body = res ?? { legacy: true, reason: 'no workflow bound (or function disabled) — caller must use its legacy code path' };
          await next();
        },

        // Memory HTTP surface — console panel + manual/E2E testing. Real
        // host-plugin writes call upsertMemory/confirmMemory directly (same
        // convention as runFunction above).
        memoryList: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = { ...(ctx.action.params.values ?? {}), ...(ctx.action.params ?? {}) };
          const filter: any = {};
          if (p.entityType) filter.entity_type = String(p.entityType);
          if (p.entityId) filter.entity_id = String(p.entityId);
          const repo = this.db.getRepository('neoai_memories');
          const rows = repo ? await repo.find({ filter, sort: ['-id'], limit: 500 }) : [];
          ctx.body = { rows: rows.map((r: any) => r.toJSON()) };
          await next();
        },

        memoryUpsert: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.upsertMemory({
            entityType: String(p.entityType ?? ''),
            entityId: String(p.entityId ?? ''),
            key: p.key,
            summary: String(p.summary ?? ''),
            structured: p.structured,
            sourceRunId: p.sourceRunId,
            updatedBy: String(ctx.state?.currentUser?.nickname ?? 'admin'),
          });
          await next();
        },

        memoryConfirm: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          ctx.body = await this.confirmMemory(Number(p.id), {
            confirmedBy: String(ctx.state?.currentUser?.nickname ?? ctx.state?.currentUser?.username ?? 'admin'),
            editedSummary: p.editedSummary,
            editedStructured: p.editedStructured,
          });
          await next();
        },

        // Encrypted secrets vault (item 13) — list NEVER decrypts (not even
        // the encrypted blob leaves the server; only {id, name, configured}).
        secretsList: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const repo = this.db.getRepository('neoai_secrets');
          const rows = repo ? await repo.find({ sort: ['name'], limit: 500 }) : [];
          ctx.body = {
            rows: rows.map((r: any) => ({
              id: r.get('id'),
              name: r.get('name'),
              configured: !!r.get('value_encrypted'),
            })),
          };
          await next();
        },

        secretsSave: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const name = String(p.name ?? '').trim();
          if (!name) ctx.throw(400, 'name is required');
          if (typeof p.value !== 'string' || !p.value) ctx.throw(400, 'value is required');
          let encrypted: string;
          try {
            encrypted = encryptSecret(p.value);
          } catch (err: any) {
            ctx.throw(500, `encryption failed: ${err?.message ?? err}`);
            return;
          }
          const repo = this.db.getRepository('neoai_secrets');
          const existing = await repo.findOne({ filter: { name } });
          if (existing) {
            await repo.update({ filterByTk: existing.get('id'), values: { value_encrypted: encrypted } });
          } else {
            await repo.create({ values: { name, value_encrypted: encrypted } });
          }
          ctx.body = { ok: true };
          await next();
        },

        secretsDelete: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const id = Number(p.id);
          if (!id) ctx.throw(400, 'id is required');
          await this.db.getRepository('neoai_secrets').destroy({ filterByTk: id });
          ctx.body = { ok: true };
          await next();
        },
      },
    });

    this.registerAutomationBridge();

    // Mark runs orphaned by a process restart. 'waiting' runs keep their state.
    this.app.on('afterStart', async () => {
      try {
        const repo = this.db.getRepository('neoai_runs');
        if (!repo) return;
        const stale = await repo.find({ filter: { status: 'running' }, limit: 200 });
        for (const r of stale) {
          await repo.update({
            filterByTk: r.get('id'),
            values: { status: 'failed', error: 'interrupted by server restart', finished_at: new Date() },
          });
        }
        if (stale.length) this.app.logger.warn(`[neoai] marked ${stale.length} orphaned running run(s) as failed`);
      } catch (err) {
        this.app.logger.warn(`[neoai] restart sweep failed (non-fatal): ${err}`);
      }
      this.startScheduler();
    });
    this.app.on('beforeStop', () => {
      if (this.schedulerTimer) clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    });
  }

  // ---------------------------------------------------------------------------
  // Automation bridge (scoping Q21 "Beides" + Q2 automation hub): registers a
  // "neoai-run" instruction on NocoBase's plugin-workflow so ANY automation
  // (collection event, schedule, action) can invoke a published NeoAI workflow
  // as a step. Registered as a plain InstructionInterface object — no import
  // from plugin-workflow needed (its registerInstruction accepts instances).
  // Best-effort: absence of plugin-workflow must never break load.

  private registerAutomationBridge() {
    try {
      const wf: any = this.app.pm?.get?.('workflow');
      if (!wf?.registerInstruction) {
        this.app.logger.info('[neoai] plugin-workflow not present — automation bridge skipped');
        return;
      }
      const plugin = this;
      wf.registerInstruction('neoai-run', {
        run: async (node: any, _input: any, processor: any) => {
          // JOB_STATUS constants: PENDING=0, RESOLVED=1, FAILED=-1.
          try {
            const cfg = node.config ?? {};
            const key = String(cfg.workflowKey ?? '').trim();
            let input: any = {};
            if (typeof cfg.inputJson === 'string' && cfg.inputJson.trim()) {
              try {
                input = JSON.parse(cfg.inputJson);
              } catch {
                return { status: -1, result: { error: 'neoai-run: inputJson is not valid JSON' } };
              }
            } else if (cfg.input && typeof cfg.input === 'object') {
              input = cfg.input;
            }
            if (cfg.includeContext !== false) {
              // Hand the triggering record/context through under a stable key.
              input = { ...input, $trigger: processor?.execution?.context ?? null };
            }
            const started = await plugin.startRun({
              workflowKey: key,
              input,
              trigger: 'automation',
              triggeredBy: `plugin-workflow:${processor?.execution?.workflow?.title ?? processor?.execution?.workflowId ?? '?'}`,
              confirmed: true, // configuring the automation IS the admin's consent
            });
            if (!('runId' in started)) {
              return { status: -1, result: { error: (started as any).error ?? 'needsConfirm unexpected here' } };
            }
            const done = await plugin.waitForRun(started.runId, 120_000);
            if (done.status === 'succeeded') return { status: 1, result: { runId: started.runId, output: done.output } };
            return { status: -1, result: { runId: started.runId, error: done.error ?? `run ended ${done.status}` } };
          } catch (err: any) {
            return { status: -1, result: { error: String(err?.message ?? err) } };
          }
        },
      });
      this.app.logger.info('[neoai] automation bridge registered (plugin-workflow instruction "neoai-run")');
    } catch (err) {
      this.app.logger.warn(`[neoai] automation bridge registration failed (non-fatal): ${err}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Time triggers (scoping Q21 "Beides") — dependency-free ~30s tick.

  private startScheduler() {
    if (this.schedulerTimer) return;
    this.schedulerTimer = setInterval(() => {
      this.schedulerTick().catch((err) => this.app.logger.warn(`[neoai] scheduler tick failed: ${err}`));
    }, 30_000);
    this.app.logger.info('[neoai] scheduler started (30s tick)');
  }

  private async schedulerTick() {
    const repo = this.db.getRepository('neoai_workflows');
    if (!repo) return;
    const rows = await repo.find({ filter: { enabled: true }, limit: 200 });
    const now = new Date();
    for (const wf of rows) {
      const spec = parseSchedule(wf.get('schedule'));
      if (!spec) continue;
      const wfId = Number(wf.get('id'));
      // Overlap guard: skip while a run of this workflow is still in flight.
      if ([...this.running.values()].some((h) => h.workflowId === wfId)) continue;
      const lastRaw = wf.get('last_scheduled_at');
      const last = lastRaw ? new Date(lastRaw) : null;
      if (!isDue(spec, last, now)) continue;
      // Stamp BEFORE starting so a slow run can't double-fire on the next tick.
      await repo.update({ filterByTk: wfId, values: { last_scheduled_at: now } });
      const res = await this.startRun({
        workflowId: wfId,
        input: wf.get('schedule_input') ?? {},
        trigger: 'schedule',
        triggeredBy: 'scheduler',
        confirmed: true, // configuring a schedule IS the admin's standing consent
      });
      this.app.logger.info(`[neoai] schedule fired for workflow ${wfId}: ${JSON.stringify(res)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // In-process service for host plugins (function registry + dispatch)

  /** Idempotently register/refresh an AI function of a host plugin. */
  async registerFunction(def: { key: string; title: string; plugin: string; description?: string; inputExample?: any }) {
    const repo = this.db.getRepository('neoai_functions');
    if (!repo) return;
    const existing = await repo.findOne({ filter: { key: def.key } });
    if (existing) {
      await repo.update({
        filterByTk: existing.get('id'),
        values: { title: def.title, plugin: def.plugin, description: def.description ?? existing.get('description') },
      });
    } else {
      await repo.create({
        values: {
          key: def.key,
          title: def.title,
          plugin: def.plugin,
          description: def.description ?? '',
          input_example: def.inputExample ?? null,
          enabled: true,
        },
      });
    }
  }

  /**
   * Dispatch a host-plugin AI function through its bound workflow.
   * Returns null when no workflow is bound/enabled — the caller MUST then run
   * its legacy code path (scoping Q4: fallback stays).
   */
  async runFunction(key: string, input: any, opts: { triggeredBy?: string; wait?: boolean } = {}) {
    const fn = await this.db.getRepository('neoai_functions')?.findOne({ filter: { key } });
    if (!fn || fn.get('enabled') === false || !fn.get('workflow_id')) return null;
    const started = await this.startRun({
      workflowId: Number(fn.get('workflow_id')),
      functionKey: key,
      input,
      trigger: 'function',
      triggeredBy: opts.triggeredBy ?? `function:${key}`,
      confirmed: true, // function dispatch is programmatic — confirm gates are for the console
    });
    if (!('runId' in started)) return started;
    if (!opts.wait) return started;
    return this.waitForRun(started.runId);
  }

  // ---------------------------------------------------------------------------
  // Memory — central, entity-agnostic store (loose entity_type+entity_id, no
  // FK; mirrors neoai_functions.plugin's convention). Human-in-the-loop gate:
  // confirmMemory is the ONLY path that ever sets status:'confirmed'. Once a
  // key is confirmed, upsertMemory never touches that row again — a fresh AI
  // draft stages separately as "<key>__pending" until a human reviews it
  // (owner decision: confirmed content stays frozen, never silently reverted).

  private static PENDING_SUFFIX = '__pending';

  /** Idempotent upsert. Returns the row that was written (always 'draft'). */
  async upsertMemory(input: {
    entityType: string;
    entityId: string;
    key?: string;
    summary: string;
    structured?: any;
    sourceRunId?: number;
    updatedBy?: string;
  }): Promise<{ id: number; status: 'draft' | 'confirmed' }> {
    const repo = this.db.getRepository('neoai_memories');
    if (!repo) return { id: 0, status: 'draft' };
    const entity_type = input.entityType;
    const entity_id = input.entityId;
    const baseKey = input.key ?? 'summary';
    const values = {
      summary: input.summary,
      structured: input.structured ?? null,
      source_run_id: input.sourceRunId ?? null,
      updated_by: input.updatedBy ?? '',
      updated_at: new Date(),
    };

    const confirmed = await repo.findOne({ filter: { entity_type, entity_id, key: baseKey, status: 'confirmed' } });
    const targetKey = confirmed ? `${baseKey}${NeoaiPlugin.PENDING_SUFFIX}` : baseKey;

    const existing = await repo.findOne({ filter: { entity_type, entity_id, key: targetKey } });
    if (existing) {
      await repo.update({ filterByTk: existing.get('id'), values: { ...values, status: 'draft' } });
      return { id: Number(existing.get('id')), status: 'draft' };
    }
    const created = await repo.create({ values: { entity_type, entity_id, key: targetKey, status: 'draft', ...values } });
    return { id: Number(created.get('id')), status: 'draft' };
  }

  /**
   * Human confirms a memory row. On a plain draft row: confirms in place. On a
   * "<key>__pending" row: copies its content onto the base-key row (creating
   * it on the entity's first-ever confirmation), then deletes the pending row
   * — so there is always at most one confirmed + one pending row per key.
   */
  async confirmMemory(
    id: number,
    opts: { confirmedBy: string; editedSummary?: string; editedStructured?: any },
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    const repo = this.db.getRepository('neoai_memories');
    if (!repo) return { ok: false, reason: 'neoai_memories collection unavailable' };
    const row = await repo.findOne({ filterByTk: id });
    if (!row) return { ok: false, reason: `memory ${id} not found` };

    const key = String(row.get('key') ?? '');
    const summary = opts.editedSummary ?? row.get('summary');
    const structured = opts.editedStructured !== undefined ? opts.editedStructured : row.get('structured');
    const isPending = key.endsWith(NeoaiPlugin.PENDING_SUFFIX);

    if (!isPending) {
      await repo.update({
        filterByTk: id,
        values: { summary, structured, status: 'confirmed', confirmed_at: new Date(), updated_by: opts.confirmedBy, updated_at: new Date() },
      });
      return { ok: true };
    }

    const baseKey = key.slice(0, -NeoaiPlugin.PENDING_SUFFIX.length);
    const entity_type = row.get('entity_type');
    const entity_id = row.get('entity_id');
    const sourceRunId = row.get('source_run_id') ?? null;
    const baseRow = await repo.findOne({ filter: { entity_type, entity_id, key: baseKey } });
    const baseValues = {
      summary,
      structured,
      status: 'confirmed',
      confirmed_at: new Date(),
      updated_by: opts.confirmedBy,
      updated_at: new Date(),
      source_run_id: sourceRunId,
    };
    if (baseRow) {
      await repo.update({ filterByTk: baseRow.get('id'), values: baseValues });
    } else {
      await repo.create({ values: { entity_type, entity_id, key: baseKey, ...baseValues } });
    }
    await repo.destroy({ filterByTk: id });
    return { ok: true };
  }

  /** All memory rows (any status/key) for one entity — console panel use. */
  async getMemories(entityType: string, entityId: string): Promise<any[]> {
    const repo = this.db.getRepository('neoai_memories');
    if (!repo) return [];
    const rows = await repo.find({ filter: { entity_type: entityType, entity_id: entityId }, sort: ['key'] });
    return rows.map((r: any) => r.toJSON());
  }

  /** The one confirmed row for a key — best-effort read for host-plugin context assembly. */
  async getConfirmedMemory(
    entityType: string,
    entityId: string,
    key = 'summary',
  ): Promise<{ summary: string; structured: any; confirmedAt: Date } | null> {
    const repo = this.db.getRepository('neoai_memories');
    if (!repo) return null;
    const row = await repo.findOne({ filter: { entity_type: entityType, entity_id: entityId, key, status: 'confirmed' } });
    if (!row) return null;
    return { summary: row.get('summary'), structured: row.get('structured'), confirmedAt: row.get('confirmed_at') };
  }

  private async waitForRun(runId: number, timeoutMs = 180_000) {
    const repo = this.db.getRepository('neoai_runs');
    const t0 = Date.now();
    for (;;) {
      const run = await repo.findOne({ filterByTk: runId });
      const status = String(run?.get('status') ?? 'failed');
      if (!['queued', 'running'].includes(status)) return { runId, status, output: run?.get('output'), error: run?.get('error') };
      if (Date.now() - t0 > timeoutMs) return { runId, status: 'running', timeout: true };
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // ---------------------------------------------------------------------------
  // Run lifecycle

  private async settingsRow() {
    try {
      return await this.db.getRepository('neoai_settings')?.findOne();
    } catch {
      return null;
    }
  }

  // Item 13: decrypt every configured secret ONCE per run (not per node/per
  // MCP call), into an in-memory name→value map. A secret that fails to
  // decrypt (e.g. after an APP_KEY rotation) is OMITTED with a log line —
  // never crashes the run just because one stale secret can't be read.
  private async decryptAllSecrets(): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    try {
      const repo = this.db.getRepository('neoai_secrets');
      if (!repo) return out;
      const rows = await repo.find({ limit: 500 });
      for (const row of rows) {
        const name = String(row.get('name') ?? '');
        const encrypted = row.get('value_encrypted');
        if (!name || !encrypted) continue;
        try {
          out[name] = decryptSecret(String(encrypted));
        } catch (err) {
          this.app.logger.warn(`[neoai] secret "${name}" failed to decrypt (omitted from run scope): ${err}`);
        }
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] decryptAllSecrets failed (non-fatal, run proceeds with no secrets): ${err}`);
    }
    return out;
  }

  private dayStart(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private async spentTodayUsd(workflowId?: number): Promise<number> {
    try {
      const repo = this.db.getRepository('neoai_runs');
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() }, ...(workflowId ? { workflow_id: workflowId } : {}) },
        fields: ['cost_usd'],
        limit: 2000,
      });
      return rows.reduce((s: number, r: any) => s + (Number(r.get('cost_usd')) || 0), 0);
    } catch {
      return 0;
    }
  }

  private async spentTodayByWorkflow(): Promise<Record<string, number>> {
    try {
      const repo = this.db.getRepository('neoai_runs');
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() } },
        fields: ['workflow_id', 'cost_usd'],
        limit: 2000,
      });
      const out: Record<string, number> = {};
      for (const r of rows) {
        const k = String(r.get('workflow_id') ?? '');
        out[k] = (out[k] ?? 0) + (Number(r.get('cost_usd')) || 0);
      }
      return out;
    } catch {
      return {};
    }
  }

  /** Per-function spend today (item 14) — same shape as spentTodayByWorkflow. */
  private async spentTodayByFunction(): Promise<Record<string, number>> {
    try {
      const repo = this.db.getRepository('neoai_runs');
      const rows = await repo.find({
        filter: { started_at: { $gte: this.dayStart() }, function_key: { $ne: '' } },
        fields: ['function_key', 'cost_usd'],
        limit: 2000,
      });
      const out: Record<string, number> = {};
      for (const r of rows) {
        const k = String(r.get('function_key') ?? '');
        if (!k) continue;
        out[k] = (out[k] ?? 0) + (Number(r.get('cost_usd')) || 0);
      }
      return out;
    } catch {
      return {};
    }
  }

  /** 30-day spend trend + per-workflow/per-function leaderboard (item 16). */
  async spendTrend(): Promise<{ byDay: Record<string, number>; byWorkflow: Array<{ workflowId: string; name: string; totalUsd: number }>; byFunction: Array<{ functionKey: string; totalUsd: number }> }> {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);
    const repo = this.db.getRepository('neoai_runs');
    const rows = await repo.find({
      filter: { started_at: { $gte: since } },
      fields: ['workflow_id', 'function_key', 'cost_usd', 'started_at'],
      appends: ['workflow'],
      limit: 20_000,
    });
    const byDay: Record<string, number> = {};
    const byWorkflowMap = new Map<string, { name: string; totalUsd: number }>();
    const byFunctionMap = new Map<string, number>();
    for (const r of rows) {
      const cost = Number(r.get('cost_usd')) || 0;
      const started = r.get('started_at');
      const day = started ? new Date(started).toISOString().slice(0, 10) : 'unknown';
      byDay[day] = (byDay[day] ?? 0) + cost;
      const wfId = String(r.get('workflow_id') ?? '');
      if (wfId) {
        const wfName = (r as any).get?.('workflow')?.name ?? wfId;
        const entry = byWorkflowMap.get(wfId) ?? { name: wfName, totalUsd: 0 };
        entry.totalUsd += cost;
        byWorkflowMap.set(wfId, entry);
      }
      const fnKey = String(r.get('function_key') ?? '');
      if (fnKey) byFunctionMap.set(fnKey, (byFunctionMap.get(fnKey) ?? 0) + cost);
    }
    return {
      byDay,
      byWorkflow: [...byWorkflowMap.entries()].map(([workflowId, v]) => ({ workflowId, ...v })).sort((a, b) => b.totalUsd - a.totalUsd),
      byFunction: [...byFunctionMap.entries()].map(([functionKey, totalUsd]) => ({ functionKey, totalUsd })).sort((a, b) => b.totalUsd - a.totalUsd),
    };
  }

  /** `versionOverride` re-runs a SPECIFIC historical version (item 8's re-run) instead of always the current published one. */
  private async loadPublishedDefinition(workflowId: number, versionOverride?: number): Promise<{ def: WorkflowDef; version: number } | null> {
    const wf = await this.db.getRepository('neoai_workflows').findOne({ filterByTk: workflowId });
    if (!wf) return null;
    const version = versionOverride ?? Number(wf.get('current_version') ?? 0);
    if (!version) return null;
    const row = await this.db.getRepository('neoai_workflow_versions').findOne({
      filter: { workflow_id: workflowId, version },
    });
    if (!row) return null;
    return { def: (row.get('definition') ?? {}) as WorkflowDef, version };
  }

  async startRun(opts: {
    workflowId?: number;
    workflowKey?: string;
    functionKey?: string;
    input: any;
    draft?: boolean;
    confirmed?: boolean;
    trigger: string;
    triggeredBy: string;
    /** Draft-test-run only (never used for real triggers): skip already-known-good top-level nodes. */
    skipToNodeId?: string;
    seedVars?: Record<string, any>;
    /** Re-run (item 8) only: reproduce a SPECIFIC historical published version, not necessarily current. */
    pinnedVersion?: number;
  }): Promise<{ runId: number } | { needsConfirm: true; workflowId: number } | { error: string }> {
    const wfRepo = this.db.getRepository('neoai_workflows');
    const wf = opts.workflowId
      ? await wfRepo.findOne({ filterByTk: opts.workflowId })
      : await wfRepo.findOne({ filter: { key: String(opts.workflowKey ?? '') } });
    if (!wf) return { error: 'workflow not found' };
    const workflowId = Number(wf.get('id'));

    let def: WorkflowDef;
    let version = 0;
    if (opts.draft) {
      def = (wf.get('definition_draft') ?? {}) as WorkflowDef;
    } else {
      const published = await this.loadPublishedDefinition(workflowId, opts.pinnedVersion);
      if (!published) return { error: 'workflow has no published version (publish it first, or run as draft test)' };
      def = published.def;
      version = published.version;
      if (wf.get('enabled') !== true && opts.trigger !== 'manual' && opts.trigger !== 'test') {
        return { error: 'workflow is disabled' };
      }
    }
    const errors = validateDefinition(def);
    if (errors.length) return { error: `invalid definition: ${errors.map((e) => e.message).join('; ')}` };

    if (wf.get('require_confirm') === true && opts.confirmed !== true) {
      // Confirm gate with an honest estimate: model-call counts + today's spend
      // vs budgets (we don't fake a €-prediction — token use depends on inputs).
      const counts = countModelNodes(def);
      const settings = await this.settingsRow();
      return {
        needsConfirm: true,
        workflowId,
        estimate: {
          llmCalls: counts.llm,
          imageCalls: counts.image,
          spentTodayUsd: await this.spentTodayUsd(),
          workflowSpentTodayUsd: await this.spentTodayUsd(workflowId),
          globalDailyBudgetUsd: Number(settings?.get?.('daily_budget_usd')) || 0,
          workflowDailyBudgetUsd: Number(wf.get('daily_budget_usd')) || 0,
        },
      };
    }

    const run = await this.db.getRepository('neoai_runs').create({
      values: {
        workflow_id: workflowId,
        version,
        function_key: opts.functionKey ?? '',
        status: 'running',
        trigger: opts.trigger,
        input: truncateJson(opts.input, 60_000),
        triggered_by: opts.triggeredBy,
        started_at: new Date(),
      },
    });
    const runId = Number(run.get('id'));
    const handle: RunHandle = { cancelled: false, workflowId };
    this.running.set(runId, handle);

    const seed = opts.draft && opts.skipToNodeId ? { skipToNodeId: opts.skipToNodeId, vars: opts.seedVars } : undefined;
    setImmediate(() => {
      this.executeRun(runId, def, opts.input, handle, wf, opts.trigger, opts.functionKey, undefined, seed).catch((err) => {
        this.app.logger.error(`[neoai] run ${runId} crashed outside runner: ${err}`);
      });
    });

    return { runId };
  }

  private async resumeRun(runId: number, approval: { approved: boolean; comment: string; by: string }) {
    const repo = this.db.getRepository('neoai_runs');
    const run = await repo.findOne({ filterByTk: runId });
    if (!run) return { error: `run ${runId} not found` };
    if (run.get('status') !== 'waiting') return { error: `run ${runId} is not waiting (status ${run.get('status')})` };
    const state = run.get('state');
    if (!state?.frames) return { error: `run ${runId} has no resumable state` };
    const wf = await this.db.getRepository('neoai_workflows').findOne({ filterByTk: run.get('workflow_id') });
    if (!wf) return { error: 'workflow of this run no longer exists' };

    await repo.update({ filterByTk: runId, values: { status: 'running', waiting_message: '' } });
    const handle: RunHandle = { cancelled: false };
    this.running.set(runId, handle);
    const input = run.get('input') ?? {};

    setImmediate(() => {
      this.executeRun(runId, { nodes: [] }, input, handle, wf, String(run.get('trigger') ?? ''), String(run.get('function_key') ?? ''), { state, approval }).catch((err) => {
        this.app.logger.error(`[neoai] resume ${runId} crashed outside runner: ${err}`);
      });
    });
    return { ok: true, runId };
  }

  /**
   * Re-run a terminal run with (optionally) edited input (item 8). Reproduces
   * the SAME published version the original run used (falls back to the
   * current published version if the original was a draft test run, since
   * draft snapshots aren't retained).
   */
  async rerunRun(runId: number, newInput: any, opts: { triggeredBy?: string } = {}) {
    const repo = this.db.getRepository('neoai_runs');
    const run = await repo.findOne({ filterByTk: runId });
    if (!run) return { error: `run ${runId} not found` };
    const workflowId = Number(run.get('workflow_id'));
    const originalVersion = Number(run.get('version') ?? 0);
    return this.startRun({
      workflowId,
      input: newInput,
      draft: originalVersion === 0,
      pinnedVersion: originalVersion || undefined,
      trigger: 're-run',
      triggeredBy: opts.triggeredBy ?? `re-run:#${runId}`,
      confirmed: true, // reviewing the input before clicking Re-run IS the confirmation
    });
  }

  /**
   * Batch/bulk dispatch (item 9): one run per item, sequential enqueue (each
   * startRun call only queues via setImmediate and returns almost instantly —
   * sequential keeps a cold budget-cache from being scanned N times at once).
   */
  async batchRun(opts: { workflowId?: number; workflowKey?: string; items: any[]; triggeredBy?: string }) {
    const items = Array.isArray(opts.items) ? opts.items : [];
    if (!items.length) return { error: 'items array required' };
    if (items.length > 200) return { error: 'batch too large (max 200 — split into multiple batches)' };
    const results: Array<{ runId?: number; error?: string }> = [];
    for (const item of items) {
      const started = await this.startRun({
        workflowId: opts.workflowId,
        workflowKey: opts.workflowKey,
        input: item,
        trigger: 'batch',
        triggeredBy: opts.triggeredBy ?? 'batch',
        confirmed: true, // batch-dispatching from the console IS the admin's consent
      });
      if ('runId' in started) results.push({ runId: started.runId });
      else results.push({ error: 'error' in started ? started.error : 'needs confirmation (unexpected for batch)' });
    }
    return { started: results };
  }

  private async executeRun(
    runId: number,
    def: WorkflowDef,
    input: any,
    handle: RunHandle,
    wf: any,
    trigger: string,
    functionKey?: string,
    resume?: { state: any; approval: any },
    seed?: { skipToNodeId?: string; vars?: Record<string, any> },
  ) {
    const runsRepo = this.db.getRepository('neoai_runs');
    const stepsRepo = this.db.getRepository('neoai_run_steps');
    const settings = await this.settingsRow();
    const prices = { ...DEFAULT_PRICES, ...((settings?.get?.('prices') as any) ?? {}) };
    const workflowId = Number(wf.get('id'));
    const fnRow = functionKey ? await this.db.getRepository('neoai_functions')?.findOne({ filter: { key: functionKey } }) : null;
    const functionDailyBudgetUsd = Number(fnRow?.get?.('daily_budget_usd')) || 0;
    const secrets = await this.decryptAllSecrets();

    let seq = 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;
    let spendCache: { at: number; global: number; wf: number; fn: number } | null = null;
    // start-row correlation: last open step row per path|nodeId
    const openSteps = new Map<string, { id: number; startedAt: number }>();

    const onStep = async (evt: StepEvent) => {
      try {
        const key = `${evt.path ?? ''}|${evt.nodeId}`;
        if (evt.phase === 'start') {
          seq += 1;
          const row = await stepsRepo.create({
            values: {
              run_id: runId,
              seq,
              node_id: evt.nodeId,
              node_type: evt.nodeType,
              title: evt.title,
              path: evt.path ?? '',
              status: 'running',
              started_at: new Date(),
            },
          });
          openSteps.set(key, { id: Number(row.get('id')), startedAt: Date.now() });
          return;
        }
        const open = openSteps.get(key);
        const finished = new Date();
        const statusMap: Record<string, string> = { done: 'done', error: 'failed', suspend: 'waiting', skipped: 'skipped' };
        const values: any = {
          status: statusMap[evt.phase] ?? 'done',
          finished_at: evt.phase === 'suspend' ? null : finished,
          duration_ms: open ? Date.now() - open.startedAt : 0,
          output: truncateJson(evt.output, 8000),
          error: evt.error ?? null,
          input_tokens: evt.usage?.inputTokens ?? 0,
          output_tokens: evt.usage?.outputTokens ?? 0,
          cost_usd: evt.costUsd ?? 0,
        };
        if (open) {
          await stepsRepo.update({ filterByTk: open.id, values });
          openSteps.delete(key);
        } else {
          // After a process restart the open-step map is empty — a resumed
          // human gate's completion must HEAL its original 'waiting' row
          // instead of duplicating it.
          const stale = await stepsRepo.findOne({
            filter: { run_id: runId, node_id: evt.nodeId, status: 'waiting' },
          });
          if (stale) {
            await stepsRepo.update({ filterByTk: stale.get('id'), values });
            return;
          }
          seq += 1;
          await stepsRepo.create({
            values: {
              run_id: runId,
              seq,
              node_id: evt.nodeId,
              node_type: evt.nodeType,
              title: evt.title,
              path: evt.path ?? '',
              started_at: finished,
              ...values,
            },
          });
        }
      } catch (err) {
        this.app.logger.warn(`[neoai] step persist failed (run ${runId}, node ${evt.nodeId}): ${err}`);
      }
    };

    const execLeaf = execLeafFactory({
      app: this.app,
      prices,
      imagePriceUsd: Number(settings?.get?.('image_price_usd')) || DEFAULT_IMAGE_PRICE_USD,
      defaultModel: String(settings?.get?.('default_model') || 'gemini-2.5-flash'),
      defaultService: String(settings?.get?.('default_llm_service') || ''),
      secrets,
      guardModelCall: async () => {
        // One DB scan feeds ALL THREE budget checks; cached 5s so multi-LLM
        // workflows don't re-scan runs on every node.
        const now = Date.now();
        if (!spendCache || now - spendCache.at > 5000) {
          const byWf = await this.spentTodayByWorkflow();
          const global = Object.values(byWf).reduce((s, v) => s + v, 0);
          const byFn = functionKey ? await this.spentTodayByFunction() : {};
          spendCache = { at: now, global, wf: byWf[String(workflowId)] ?? 0, fn: byFn[String(functionKey)] ?? 0 };
        }
        const check = checkBudget({
          spentTodayUsd: spendCache.global + totalCost,
          workflowSpentTodayUsd: spendCache.wf + totalCost,
          globalDailyBudgetUsd: Number(settings?.get?.('daily_budget_usd')) || 0,
          workflowDailyBudgetUsd: Number(wf.get('daily_budget_usd')) || 0,
          functionSpentTodayUsd: spendCache.fn + totalCost,
          functionDailyBudgetUsd,
        });
        if (!check.ok) throw new Error(`budget: ${check.reason}`);
      },
      recordUsage: (usage, costUsd) => {
        totalIn += usage.inputTokens ?? 0;
        totalOut += usage.outputTokens ?? 0;
        totalCost += costUsd ?? 0;
      },
    });

    const runner = new Runner({
      // {{secrets.name}} resolves through the existing getPath(scope, ...)
      // mechanism with zero changes to template.ts — secrets are merged into
      // the scope right here, the one place every leaf's scope passes through.
      execLeaf: (node, scope) => execLeaf(node, { ...scope, secrets }),
      onStep,
      isCancelled: () => handle.cancelled,
      loadWorkflow: async (key: string) => {
        const sub = await this.db.getRepository('neoai_workflows').findOne({ filter: { key } });
        if (!sub) return null;
        const published = await this.loadPublishedDefinition(Number(sub.get('id')));
        return published?.def ?? null;
      },
    });

    let outcome: RunOutcome;
    try {
      outcome = resume
        ? await runner.resume(def, input, resume.state, resume.approval, { id: runId })
        : await runner.run(def, input, { id: runId }, seed);
    } catch (err: any) {
      outcome = { status: 'failed', error: String(err?.message ?? err) };
    }
    this.running.delete(runId);

    // Totals ADD to what the row already carries (a resumed run keeps the
    // spend of its pre-suspend execution).
    let prevIn = 0;
    let prevOut = 0;
    let prevCost = 0;
    try {
      const prev = await runsRepo.findOne({ filterByTk: runId });
      prevIn = Number(prev?.get('input_tokens')) || 0;
      prevOut = Number(prev?.get('output_tokens')) || 0;
      prevCost = Number(prev?.get('cost_usd')) || 0;
    } catch {
      /* best-effort */
    }
    const totals = {
      input_tokens: prevIn + totalIn,
      output_tokens: prevOut + totalOut,
      cost_usd: Math.round((prevCost + totalCost) * 1e6) / 1e6,
    };
    try {
      if (outcome.status === 'succeeded') {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: 'succeeded', output: truncateJson(outcome.output, 60_000), finished_at: new Date(), state: null, ...this.addTotals(totals, runId) },
        });
      } else if (outcome.status === 'waiting') {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: 'waiting', state: outcome.state, waiting_message: outcome.message ?? 'Approval required', ...this.addTotals(totals, runId) },
        });
      } else if (outcome.status === 'cancelled') {
        await runsRepo.update({
          filterByTk: runId,
          values: { status: 'cancelled', finished_at: new Date(), state: null, ...this.addTotals(totals, runId) },
        });
      } else {
        await runsRepo.update({
          filterByTk: runId,
          values: {
            status: handle.cancelled ? 'cancelled' : 'failed',
            error: outcome.status === 'failed' ? outcome.error : null,
            finished_at: new Date(),
            state: null,
            ...this.addTotals(totals, runId),
          },
        });
        // On-failure hook (item 7): fires the named workflow once, only for a
        // REAL failure (not a cancellation) and never for a run that IS
        // itself a hook — hooks are single-level, they don't chain.
        if (!handle.cancelled && trigger !== 'failure-hook') {
          const hookKey = String(wf.get('on_failure_workflow_key') ?? '').trim();
          if (hookKey) {
            try {
              const hookScope = { run: { id: runId, error: outcome.status === 'failed' ? outcome.error : null }, input };
              const hookInput = resolveTemplates(wf.get('on_failure_input') ?? {}, hookScope);
              await this.startRun({
                workflowKey: hookKey,
                input: hookInput,
                trigger: 'failure-hook',
                triggeredBy: `failure-hook:${workflowId}`,
                confirmed: true, // configuring the hook IS the admin's consent
              });
            } catch (err) {
              this.app.logger.warn(`[neoai] on-failure hook for run ${runId} failed to start (non-fatal): ${err}`);
            }
          }
        }
      }
    } catch (err) {
      this.app.logger.error(`[neoai] run ${runId}: final status persist failed: ${err}`);
    }
  }

  /** Spread helper: only include totals when anything was spent/counted. */
  private addTotals(totals: { input_tokens: number; output_tokens: number; cost_usd: number }, _runId: number) {
    return totals.input_tokens || totals.output_tokens || totals.cost_usd ? totals : {};
  }

  // ---------------------------------------------------------------------------
  // Idempotent provisioning (CRM ensureCollection/ensureField pattern)

  private async setup() {
    for (const values of NEOAI_COLLECTIONS) {
      try {
        await this.ensureCollection(values);
      } catch (err) {
        this.app.logger.error(`[neoai] ensureCollection ${values.name} failed: ${err}`);
      }
    }
    for (const { collection, field } of NEOAI_EXTRA_FIELDS) {
      try {
        await this.ensureField(collection, field);
      } catch (err) {
        this.app.logger.warn(`[neoai] ensureField ${collection}.${field?.name} failed (non-fatal): ${err}`);
      }
    }
    try {
      const repo = this.db.getRepository('neoai_settings');
      if (repo && !(await repo.findOne())) {
        await repo.create({ values: { default_model: 'gemini-2.5-flash', daily_budget_usd: 0, image_price_usd: 0.04 } });
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] settings seed failed (non-fatal): ${err}`);
    }
    await this.ensureMenuLinks();
    try {
      await ensureSeedWorkflows(this);
    } catch (err) {
      this.app.logger.warn(`[neoai] seed workflows failed (non-fatal): ${err}`);
    }
  }

  private async ensureCollection(values: any) {
    const repo = this.db.getRepository('collections');
    let model = await repo.findOne({ filter: { name: values.name } });
    if (model) {
      if (values.titleField && model.get('titleField') !== values.titleField) {
        await repo.update({ filterByTk: values.name, values: { titleField: values.titleField } });
      }
    } else {
      model = await repo.create({ values });
      this.app.logger.info(`[neoai] created collection "${values.name}"`);
    }
    await model.load();
    await this.db.getCollection(values.name).sync({ force: false, alter: { drop: false } });
  }

  private async ensureField(collectionName: string, values: any) {
    const fieldsRepo = this.db.getRepository('fields');
    let field = await fieldsRepo.findOne({ filter: { collectionName, name: values.name } });
    if (!field) {
      field = await fieldsRepo.create({ values: { collectionName, ...values } });
      this.app.logger.info(`[neoai] created field ${collectionName}.${values.name}`);
    }
    await field.load();
    await this.db.getCollection(collectionName).sync({ force: false, alter: { drop: false } });
  }

  private async ensureMenuLinks() {
    try {
      const routesRepo: any = this.db.getRepository('desktopRoutes');
      if (!routesRepo) return;
      const existing = await routesRepo.find({ filter: { type: 'link' } });
      for (const link of MENU_LINKS) {
        const hit =
          existing.find((l: any) => l.options?.href === link.href) ??
          existing.find((l: any) => (link.legacyHrefs ?? []).includes(l.options?.href));
        if (hit) {
          if (hit.title !== link.title || hit.icon !== link.icon || hit.options?.href !== link.href) {
            await routesRepo.update({
              filterByTk: hit.id,
              values: { title: link.title, icon: link.icon, sort: link.sort, options: { href: link.href, openInNewWindow: false } },
            });
          }
          continue;
        }
        await routesRepo.create({
          values: { type: 'link', title: link.title, icon: link.icon, sort: link.sort, options: { href: link.href, openInNewWindow: false } },
        });
        this.app.logger.info(`[neoai] menu link provisioned: ${link.title} → ${link.href}`);
      }
    } catch (err) {
      this.app.logger.warn(`[neoai] menu link provisioning failed (non-fatal): ${err}`);
    }
  }
}

export default NeoaiPlugin;
