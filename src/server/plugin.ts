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
import { truncateJson } from './lib/template';
import { ensureSeedWorkflows } from './seed';

/** Count budget-relevant nodes for the confirm-gate estimate. */
function countModelNodes(def: WorkflowDef): { llm: number; image: number } {
  const out = { llm: 0, image: 0 };
  const walk = (nodes: any[]) => {
    for (const n of nodes ?? []) {
      if (n.type === 'llm') out.llm += 1;
      if (n.type === 'image') out.image += 1;
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
          ctx.body = {
            ok: true,
            plugin: pkg.name,
            version: pkg.version,
            sandbox: isSandbox(),
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

        publishWorkflow: async (ctx: any, next: any) => {
          requireAdmin(ctx);
          const p = ctx.action.params.values ?? {};
          const wfRepo = this.db.getRepository('neoai_workflows');
          const wf = await wfRepo.findOne({ filterByTk: Number(p.workflowId) });
          if (!wf) ctx.throw(404, 'workflow not found');
          const def = (wf.get('definition_draft') ?? {}) as WorkflowDef;
          const errors = validateDefinition(def);
          if (errors.length) {
            ctx.body = { ok: false, errors };
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
          for (const k of ['default_llm_service', 'default_model', 'daily_budget_usd', 'image_price_usd', 'prices']) {
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
      },
    });

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

  private async loadPublishedDefinition(workflowId: number): Promise<{ def: WorkflowDef; version: number } | null> {
    const wf = await this.db.getRepository('neoai_workflows').findOne({ filterByTk: workflowId });
    if (!wf) return null;
    const version = Number(wf.get('current_version') ?? 0);
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
      const published = await this.loadPublishedDefinition(workflowId);
      if (!published) return { error: 'workflow has no published version (publish it first, or run as draft test)' };
      def = published.def;
      version = published.version;
      if (wf.get('enabled') !== true && opts.trigger !== 'manual' && opts.trigger !== 'test') {
        return { error: 'workflow is disabled' };
      }
    }
    const errors = validateDefinition(def);
    if (errors.length) return { error: `invalid definition: ${errors.join('; ')}` };

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

    setImmediate(() => {
      this.executeRun(runId, def, opts.input, handle, wf).catch((err) => {
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
      this.executeRun(runId, { nodes: [] }, input, handle, wf, { state, approval }).catch((err) => {
        this.app.logger.error(`[neoai] resume ${runId} crashed outside runner: ${err}`);
      });
    });
    return { ok: true, runId };
  }

  private async executeRun(
    runId: number,
    def: WorkflowDef,
    input: any,
    handle: RunHandle,
    wf: any,
    resume?: { state: any; approval: any },
  ) {
    const runsRepo = this.db.getRepository('neoai_runs');
    const stepsRepo = this.db.getRepository('neoai_run_steps');
    const settings = await this.settingsRow();
    const prices = { ...DEFAULT_PRICES, ...((settings?.get?.('prices') as any) ?? {}) };
    const workflowId = Number(wf.get('id'));

    let seq = 0;
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;
    let spendCache: { at: number; global: number; wf: number } | null = null;
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
      guardModelCall: async () => {
        // One DB scan feeds BOTH budget checks; cached 5s so multi-LLM
        // workflows don't re-scan runs on every node.
        const now = Date.now();
        if (!spendCache || now - spendCache.at > 5000) {
          const byWf = await this.spentTodayByWorkflow();
          const global = Object.values(byWf).reduce((s, v) => s + v, 0);
          spendCache = { at: now, global, wf: byWf[String(workflowId)] ?? 0 };
        }
        const check = checkBudget({
          spentTodayUsd: spendCache.global + totalCost,
          workflowSpentTodayUsd: spendCache.wf + totalCost,
          globalDailyBudgetUsd: Number(settings?.get?.('daily_budget_usd')) || 0,
          workflowDailyBudgetUsd: Number(wf.get('daily_budget_usd')) || 0,
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
      execLeaf: (node, scope) => execLeaf(node, scope),
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
        : await runner.run(def, input, { id: runId });
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
