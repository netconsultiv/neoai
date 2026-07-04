// src/server/lib/runner.ts
// -----------------------------------------------------------------------------
// The NeoAI execution engine: a TREE walker (owner decision: tree structure is
// enough — no free DAG). A workflow definition is a root sequence of nodes;
// structural nodes carry child branches:
//
//   condition  branches[0] = when-true,  branches[1] = when-false (optional)
//   parallel   branches[i] = concurrent branch i (no suspend inside)
//   loop       branches[0] = body, iterated over `items` (array) with a cap
//   (leaf)     llm · image · http · data · transform · human_gate · output ·
//              subworkflow — executed via the injected LeafExec
//
// Durable suspend: the interpreter runs on an EXPLICIT, JSON-serializable
// frame stack. When a human_gate leaf asks to suspend, the whole state
// ({frames, vars, output}) is handed back for persistence on the run row;
// resume() re-hydrates it, injects the approval as the gate node's output and
// continues AFTER the gate. Restart-durability of waiting runs comes free.
//
// The core is PURE: all effects (leaf execution, step recording, cancellation,
// sub-workflow loading) are injected through the Runtime — unit tests drive it
// with fakes.

import { evalCondition, resolveTemplates } from './template.ts';
import type { Scope } from './template.ts';

export type NodeDef = {
  id: string;
  type: string;
  title?: string;
  config?: any;
  branches?: NodeDef[][];
};

export type WorkflowDef = { nodes: NodeDef[] };

export type LeafResult = {
  output?: any;
  /** human_gate: persist state and stop here; approval later becomes the output */
  suspend?: boolean;
  /** output node may end the run early */
  end?: boolean;
  usage?: { inputTokens?: number; outputTokens?: number };
  costUsd?: number;
};

export type StepEvent = {
  nodeId: string;
  nodeType: string;
  title: string;
  phase: 'start' | 'done' | 'error' | 'suspend' | 'skipped';
  output?: any;
  error?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  costUsd?: number;
  /** loop iteration / parallel branch context for display, e.g. "par[1]" */
  path?: string;
};

export type Runtime = {
  /** Execute a leaf node. Structural nodes never reach this. */
  execLeaf: (node: NodeDef, scope: Scope, path: string) => Promise<LeafResult>;
  /** Persist/report one step lifecycle event (fire-and-forget semantics). */
  onStep: (evt: StepEvent) => Promise<void> | void;
  /** Cooperative cancellation — checked before every node. */
  isCancelled: () => boolean;
  /** Load a published sub-workflow definition by key (subworkflow node). */
  loadWorkflow?: (key: string) => Promise<WorkflowDef | null>;
  /** Sub-workflow nesting guard. */
  depth?: number;
};

export type Frame =
  | { kind: 'seq'; nodes: NodeDef[]; idx: number; path: string }
  | {
      kind: 'loop';
      node: NodeDef;
      items: any[];
      iter: number;
      idx: number;
      path: string;
    };

export type RunState = {
  frames: Frame[];
  vars: Record<string, any>;
  output?: any;
  /** id of the gate node a suspended run is waiting on */
  waitingNodeId?: string;
};

export type RunOutcome =
  | { status: 'succeeded'; output: any; vars: Record<string, any> }
  | { status: 'waiting'; state: RunState; message?: string }
  | { status: 'cancelled' }
  | { status: 'failed'; error: string; nodeId?: string };

export class CancelledError extends Error {
  constructor() {
    super('cancelled');
  }
}

const MAX_LOOP_ITERATIONS = 100;
const MAX_SUBWORKFLOW_DEPTH = 3;
/** Hard ceiling regardless of an authored `config.maxTurns` (item 20). */
const MAX_AGENT_TURNS = 25;
const STRUCTURAL = new Set(['condition', 'parallel', 'loop', 'agent']);

function baseScope(input: any, vars: Record<string, any>, runMeta: any): Scope {
  return { input, nodes: vars, run: runMeta ?? {} };
}

export type ValidationError = { nodeId?: string; message: string };

/** Validate structural constraints at publish time (and defensively at run time). */
export function validateDefinition(def: WorkflowDef): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  const walk = (nodes: NodeDef[], insideParallel: boolean) => {
    for (const n of nodes ?? []) {
      if (!n.id || typeof n.id !== 'string') errors.push({ message: `node without id (type ${n.type})` });
      else if (seen.has(n.id)) errors.push({ nodeId: n.id, message: `duplicate node id "${n.id}"` });
      else seen.add(n.id);
      if (!n.type) errors.push({ nodeId: n.id, message: `node "${n.id}" without type` });
      if (insideParallel && n.type === 'human_gate') {
        errors.push({ nodeId: n.id, message: `human_gate "${n.id}" inside a parallel block is not supported (v1)` });
      }
      const branches = n.branches ?? [];
      if (n.type === 'condition' && branches.length < 1) errors.push({ nodeId: n.id, message: `condition "${n.id}" needs branches[0]` });
      if (n.type === 'loop' && branches.length < 1) errors.push({ nodeId: n.id, message: `loop "${n.id}" needs branches[0] (body)` });
      if (n.type === 'parallel' && branches.length < 1) errors.push({ nodeId: n.id, message: `parallel "${n.id}" needs at least one branch` });
      if (n.type === 'agent') {
        if (!Array.isArray(n.config?.tools) || n.config.tools.length < 1) {
          errors.push({ nodeId: n.id, message: `agent "${n.id}" needs at least one tool in config.tools` });
        }
        if (!String(n.config?.goal ?? '').trim()) {
          errors.push({ nodeId: n.id, message: `agent "${n.id}" needs a non-empty goal` });
        }
      }
      for (const b of branches) walk(b ?? [], insideParallel || n.type === 'parallel');
    }
  };
  walk(def?.nodes ?? [], false);
  if (!def?.nodes?.length) errors.push({ message: 'workflow has no nodes' });
  return errors;
}

export class Runner {
  private rt: Runtime;

  constructor(rt: Runtime) {
    this.rt = rt;
  }

  /**
   * `seed` lets a draft test-run skip re-executing early, already-verified
   * TOP-LEVEL nodes: `vars` seeds state.vars with their cached outputs, and
   * `skipToNodeId` fast-forwards the root frame's index to that node (found
   * only among top-level `def.nodes` — nested/branch ids are out of scope
   * for v1). An id that doesn't resolve at the top level is silently
   * ignored (falls back to a normal from-the-start run) rather than erroring.
   */
  async run(
    def: WorkflowDef,
    input: any,
    runMeta?: any,
    seed?: { skipToNodeId?: string; vars?: Record<string, any> },
  ): Promise<RunOutcome> {
    const state: RunState = {
      frames: [{ kind: 'seq', nodes: def.nodes ?? [], idx: 0, path: '' }],
      vars: seed?.vars ? { ...seed.vars } : {},
      output: undefined,
    };
    if (seed?.skipToNodeId) {
      const idx = (def.nodes ?? []).findIndex((n) => n.id === seed.skipToNodeId);
      if (idx > 0) state.frames[0].idx = idx;
    }
    return this.drive(state, input, runMeta);
  }

  /** Continue a suspended run. `approval` becomes the waiting gate's output. */
  async resume(def: WorkflowDef, input: any, state: RunState, approval: any, runMeta?: any): Promise<RunOutcome> {
    // Re-bind node arrays from the CURRENT definition version by path indices —
    // frames store plain JSON after a DB round-trip, so nodes arrays inside
    // them are already plain data; nothing to re-hydrate beyond trusting the
    // persisted copy (runs pin their definition at start).
    const gateId = state.waitingNodeId;
    if (gateId) {
      state.vars[gateId] = approval;
      await this.rt.onStep({
        nodeId: gateId,
        nodeType: 'human_gate',
        title: gateId,
        phase: approval?.approved ? 'done' : 'error',
        output: approval,
        error: approval?.approved ? undefined : 'rejected',
      });
      if (!approval?.approved) {
        return { status: 'failed', error: 'rejected at approval gate', nodeId: gateId };
      }
      // Advance past the gate: the top frame's idx still points AT the gate.
      const top = state.frames[state.frames.length - 1];
      if (top) top.idx += 1;
      state.waitingNodeId = undefined;
    }
    return this.drive(state, input, runMeta);
  }

  private async drive(state: RunState, input: any, runMeta?: any): Promise<RunOutcome> {
    try {
      while (state.frames.length > 0) {
        if (this.rt.isCancelled()) throw new CancelledError();
        const frame = state.frames[state.frames.length - 1];

        // Current node list + index for this frame.
        const nodes: NodeDef[] = frame.kind === 'seq' ? frame.nodes : frame.node.branches?.[0] ?? [];
        if (frame.idx >= nodes.length) {
          // Frame done.
          if (frame.kind === 'loop') {
            const items = frame.items;
            frame.iter += 1;
            if (frame.iter < Math.min(items.length, MAX_LOOP_ITERATIONS)) {
              frame.idx = 0;
              continue;
            }
            // record loop output = per-iteration collected? v1: item count
            state.vars[frame.node.id] = { iterations: Math.min(items.length, MAX_LOOP_ITERATIONS) };
          }
          state.frames.pop();
          continue;
        }

        const node = nodes[frame.idx];
        const scope = baseScope(input, state.vars, runMeta);
        if (frame.kind === 'loop') {
          scope.item = frame.items[frame.iter];
          scope.index = frame.iter;
        }
        const path = frame.path;

        if (STRUCTURAL.has(node.type)) {
          if (node.type === 'condition') {
            const which = evalCondition(node.config, scope) ? 0 : 1;
            state.vars[node.id] = { branch: which === 0 ? 'true' : 'false' };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'done',
              output: state.vars[node.id],
              path,
            });
            frame.idx += 1;
            const branch = node.branches?.[which] ?? [];
            if (branch.length) state.frames.push({ kind: 'seq', nodes: branch, idx: 0, path });
            continue;
          }

          if (node.type === 'loop') {
            const itemsRaw = resolveTemplates(node.config?.items, scope);
            const items: any[] = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw == null ? [] : [itemsRaw];
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'done',
              output: { items: items.length },
              path,
            });
            frame.idx += 1;
            if (items.length) {
              state.frames.push({ kind: 'loop', node, items, iter: 0, idx: 0, path: `${path}${node.id}[i].` });
            } else {
              state.vars[node.id] = { iterations: 0 };
            }
            continue;
          }

          // parallel — run each branch to completion concurrently with an
          // ISOLATED sub-runner sharing vars (node ids are tree-unique).
          if (node.type === 'parallel') {
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'start',
              path,
            });
            const branches = node.branches ?? [];
            const results = await Promise.all(
              branches.map(async (branch, i) => {
                const sub: RunState = {
                  frames: [{ kind: 'seq', nodes: branch ?? [], idx: 0, path: `${path}${node.id}[${i}].` }],
                  vars: state.vars, // shared on purpose — unique ids, outputs visible downstream
                  output: undefined,
                };
                const out = await this.drive(sub, input, runMeta);
                if (out.status === 'failed') throw new Error(`branch ${i}: ${out.error}`);
                if (out.status === 'waiting') throw new Error(`branch ${i}: human_gate inside parallel is not supported`);
                if (out.status === 'cancelled') throw new CancelledError();
                return out.status === 'succeeded' ? out.output : undefined;
              }),
            );
            state.vars[node.id] = { branches: results };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'done',
              output: { branches: branches.length },
              path,
            });
            frame.idx += 1;
            continue;
          }

          // agent (item 20) — an autonomous, bounded tool-use loop run INLINE
          // (no new Frame kind): its own internal `for` loop over turns,
          // calling this.rt.execLeaf/onStep per turn exactly like every other
          // node already does — giving true per-turn persisted
          // neoai_run_steps rows for free. Hard-ceilinged at MAX_AGENT_TURNS
          // regardless of the authored config.maxTurns.
          if (node.type === 'agent') {
            const maxTurns = Math.max(1, Math.min(Number(node.config?.maxTurns) || MAX_AGENT_TURNS, MAX_AGENT_TURNS));
            const tools: any[] = Array.isArray(node.config?.tools) ? node.config.tools : [];
            const systemPrompt = node.config?.systemPrompt ?? '';
            const goal = String(node.config?.goal ?? '');
            const toolSummaries = tools.map((t) => ({ name: t.name, description: t.description ?? '', type: t.type }));

            let finished = false;
            let finalOutput: any = null;
            let turnCount = 0;
            let observations = '';

            for (let turn = 0; turn < maxTurns; turn++) {
              if (this.rt.isCancelled()) throw new CancelledError();
              turnCount = turn + 1;
              const decideId = `${node.id}::t${turn}::decide`;
              const decideNode: NodeDef = {
                id: decideId,
                type: 'agent_decide',
                title: `${node.title ?? node.id} — turn ${turn + 1} decide`,
                config: { systemPrompt, goal, tools: toolSummaries, observations },
              };
              await this.rt.onStep({ nodeId: decideId, nodeType: 'agent_decide', title: decideNode.title!, phase: 'start', path });
              let decision: LeafResult;
              try {
                decision = await this.rt.execLeaf(decideNode, scope, path);
              } catch (err: any) {
                if (err instanceof CancelledError) throw err;
                await this.rt.onStep({
                  nodeId: decideId,
                  nodeType: 'agent_decide',
                  title: decideNode.title!,
                  phase: 'error',
                  error: String(err?.message ?? err),
                  path,
                });
                return { status: 'failed', error: String(err?.message ?? err), nodeId: decideId };
              }
              state.vars[decideId] = decision.output ?? {};
              await this.rt.onStep({
                nodeId: decideId,
                nodeType: 'agent_decide',
                title: decideNode.title!,
                phase: 'done',
                output: decision.output,
                usage: decision.usage,
                costUsd: decision.costUsd,
                path,
              });

              const decided = decision.output?.json ?? decision.output ?? {};
              const action = String(decided?.action ?? '');

              if (action === 'finish') {
                finished = true;
                finalOutput = decided?.finalOutput ?? null;
                break;
              }

              const toolName = String(decided?.tool ?? '');
              const tool = tools.find((t) => t.name === toolName);
              if (!tool) {
                return { status: 'failed', error: `agent "${node.id}": decided tool "${toolName}" is not in config.tools`, nodeId: node.id };
              }
              const toolArgs = decided?.args ?? {};
              const toolStepId = `${node.id}::t${turn}::tool::${toolName}`;
              let toolOutput: any;

              if (tool.type === 'mcp') {
                const mcpNode: NodeDef = {
                  id: toolStepId,
                  type: 'mcp_tool',
                  title: `${node.title ?? node.id} — turn ${turn + 1} tool ${toolName}`,
                  config: { serverId: tool.serverId, toolName: tool.toolName ?? toolName, args: toolArgs, allowPrivate: tool.allowPrivate },
                };
                await this.rt.onStep({ nodeId: toolStepId, nodeType: 'mcp_tool', title: mcpNode.title!, phase: 'start', path });
                try {
                  const res = await this.rt.execLeaf(mcpNode, scope, path);
                  toolOutput = res.output;
                  state.vars[toolStepId] = toolOutput ?? {};
                  await this.rt.onStep({ nodeId: toolStepId, nodeType: 'mcp_tool', title: mcpNode.title!, phase: 'done', output: toolOutput, path });
                } catch (err: any) {
                  if (err instanceof CancelledError) throw err;
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: 'mcp_tool',
                    title: mcpNode.title!,
                    phase: 'error',
                    error: String(err?.message ?? err),
                    path,
                  });
                  return { status: 'failed', error: String(err?.message ?? err), nodeId: toolStepId };
                }
              } else if (tool.type === 'subworkflow') {
                // Reuse the EXACT existing inline subworkflow handling — this
                // means the "human_gate inside subworkflow is not supported"
                // guard fires automatically for free (no new code needed to
                // satisfy "no human_gate reachable from inside an agent").
                const depth = this.rt.depth ?? 0;
                if (depth >= MAX_SUBWORKFLOW_DEPTH) {
                  return { status: 'failed', error: `agent "${node.id}": tool "${toolName}": max subworkflow depth ${MAX_SUBWORKFLOW_DEPTH} exceeded`, nodeId: toolStepId };
                }
                const key = String(tool.workflowKey ?? '');
                const child = this.rt.loadWorkflow ? await this.rt.loadWorkflow(key) : null;
                if (!child) {
                  return { status: 'failed', error: `agent "${node.id}": tool "${toolName}": workflow "${key}" not found/published`, nodeId: toolStepId };
                }
                await this.rt.onStep({ nodeId: toolStepId, nodeType: 'subworkflow', title: `${node.title ?? node.id} — turn ${turn + 1} tool ${toolName}`, phase: 'start', path });
                const childRunner = new Runner({ ...this.rt, depth: depth + 1 });
                const out = await childRunner.run(child, toolArgs, runMeta);
                if (out.status === 'cancelled') throw new CancelledError();
                if (out.status === 'failed') {
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: 'subworkflow',
                    title: `${node.title ?? node.id} — turn ${turn + 1} tool ${toolName}`,
                    phase: 'error',
                    error: out.error,
                    path,
                  });
                  return { status: 'failed', error: `agent "${node.id}": tool "${toolName}": ${out.error}`, nodeId: toolStepId };
                }
                if (out.status === 'waiting') {
                  const msg = `agent "${node.id}": tool "${toolName}": human_gate inside subworkflow is not supported (v1)`;
                  await this.rt.onStep({
                    nodeId: toolStepId,
                    nodeType: 'subworkflow',
                    title: `${node.title ?? node.id} — turn ${turn + 1} tool ${toolName}`,
                    phase: 'error',
                    error: msg,
                    path,
                  });
                  return { status: 'failed', error: msg, nodeId: toolStepId };
                }
                toolOutput = out.output ?? {};
                state.vars[toolStepId] = toolOutput;
                await this.rt.onStep({
                  nodeId: toolStepId,
                  nodeType: 'subworkflow',
                  title: `${node.title ?? node.id} — turn ${turn + 1} tool ${toolName}`,
                  phase: 'done',
                  output: toolOutput,
                  path,
                });
              } else {
                return { status: 'failed', error: `agent "${node.id}": tool "${toolName}" has unknown type "${tool.type}"`, nodeId: toolStepId };
              }

              observations += `\nTurn ${turn + 1}: called tool "${toolName}" with args ${JSON.stringify(toolArgs)} → result ${JSON.stringify(toolOutput).slice(0, 2000)}`;
            }

            state.vars[node.id] = { turnCount, finished, finalOutput };
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'done',
              output: { turnCount, finished, finalOutput },
              path,
            });
            frame.idx += 1;
            continue;
          }
        }

        // ------------------------------------------------------------------
        // Leaf node
        if (node.type === 'subworkflow') {
          const depth = this.rt.depth ?? 0;
          if (depth >= MAX_SUBWORKFLOW_DEPTH) throw new Error(`subworkflow "${node.id}": max depth ${MAX_SUBWORKFLOW_DEPTH} exceeded`);
          const key = String(node.config?.workflowKey ?? '');
          const child = this.rt.loadWorkflow ? await this.rt.loadWorkflow(key) : null;
          if (!child) throw new Error(`subworkflow "${node.id}": workflow "${key}" not found/published`);
          const childInput = resolveTemplates(node.config?.input ?? {}, scope);
          await this.rt.onStep({ nodeId: node.id, nodeType: node.type, title: node.title ?? key, phase: 'start', path });
          const childRunner = new Runner({ ...this.rt, depth: depth + 1 });
          const out = await childRunner.run(child, childInput, runMeta);
          if (out.status === 'failed') throw new Error(`subworkflow "${key}": ${out.error}`);
          if (out.status === 'cancelled') throw new CancelledError();
          if (out.status === 'waiting') throw new Error(`subworkflow "${key}": human_gate inside subworkflow is not supported (v1)`);
          state.vars[node.id] = out.output ?? {};
          await this.rt.onStep({
            nodeId: node.id,
            nodeType: node.type,
            title: node.title ?? key,
            phase: 'done',
            output: out.output,
            path,
          });
          frame.idx += 1;
          continue;
        }

        await this.rt.onStep({ nodeId: node.id, nodeType: node.type, title: node.title ?? node.id, phase: 'start', path });
        let res: LeafResult;
        try {
          res = await this.rt.execLeaf(node, scope, path);
        } catch (err: any) {
          if (err instanceof CancelledError) throw err;
          const attempts = Math.max(0, Number(node.config?.retries ?? 0));
          let lastErr = err;
          let ok: LeafResult | null = null;
          for (let a = 0; a < attempts; a++) {
            if (this.rt.isCancelled()) throw new CancelledError();
            try {
              ok = await this.rt.execLeaf(node, scope, path);
              break;
            } catch (e2) {
              lastErr = e2;
            }
          }
          if (!ok) {
            await this.rt.onStep({
              nodeId: node.id,
              nodeType: node.type,
              title: node.title ?? node.id,
              phase: 'error',
              error: String(lastErr?.message ?? lastErr),
              path,
            });
            return { status: 'failed', error: String(lastErr?.message ?? lastErr), nodeId: node.id };
          }
          res = ok;
        }

        if (res.suspend) {
          state.waitingNodeId = node.id;
          await this.rt.onStep({
            nodeId: node.id,
            nodeType: node.type,
            title: node.title ?? node.id,
            phase: 'suspend',
            output: res.output,
            path,
          });
          return { status: 'waiting', state, message: res.output?.message };
        }

        state.vars[node.id] = res.output ?? {};
        if (node.type === 'output') {
          state.output = { ...(state.output ?? {}), ...(res.output ?? {}) };
        }
        await this.rt.onStep({
          nodeId: node.id,
          nodeType: node.type,
          title: node.title ?? node.id,
          phase: 'done',
          output: res.output,
          usage: res.usage,
          costUsd: res.costUsd,
          path,
        });
        frame.idx += 1;
        if (res.end) break;
      }

      return { status: 'succeeded', output: state.output ?? null, vars: state.vars };
    } catch (err: any) {
      if (err instanceof CancelledError) return { status: 'cancelled' };
      return { status: 'failed', error: String(err?.message ?? err) };
    }
  }
}
