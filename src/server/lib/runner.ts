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
const STRUCTURAL = new Set(['condition', 'parallel', 'loop']);

function baseScope(input: any, vars: Record<string, any>, runMeta: any): Scope {
  return { input, nodes: vars, run: runMeta ?? {} };
}

/** Validate structural constraints at publish time (and defensively at run time). */
export function validateDefinition(def: WorkflowDef): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const walk = (nodes: NodeDef[], insideParallel: boolean) => {
    for (const n of nodes ?? []) {
      if (!n.id || typeof n.id !== 'string') errors.push(`node without id (type ${n.type})`);
      else if (seen.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
      else seen.add(n.id);
      if (!n.type) errors.push(`node "${n.id}" without type`);
      if (insideParallel && n.type === 'human_gate') {
        errors.push(`human_gate "${n.id}" inside a parallel block is not supported (v1)`);
      }
      const branches = n.branches ?? [];
      if (n.type === 'condition' && branches.length < 1) errors.push(`condition "${n.id}" needs branches[0]`);
      if (n.type === 'loop' && branches.length < 1) errors.push(`loop "${n.id}" needs branches[0] (body)`);
      if (n.type === 'parallel' && branches.length < 1) errors.push(`parallel "${n.id}" needs at least one branch`);
      for (const b of branches) walk(b ?? [], insideParallel || n.type === 'parallel');
    }
  };
  walk(def?.nodes ?? [], false);
  if (!def?.nodes?.length) errors.push('workflow has no nodes');
  return errors;
}

export class Runner {
  private rt: Runtime;

  constructor(rt: Runtime) {
    this.rt = rt;
  }

  async run(def: WorkflowDef, input: any, runMeta?: any): Promise<RunOutcome> {
    const state: RunState = {
      frames: [{ kind: 'seq', nodes: def.nodes ?? [], idx: 0, path: '' }],
      vars: {},
      output: undefined,
    };
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
