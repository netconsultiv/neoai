// src/server/lib/nodes.ts
// -----------------------------------------------------------------------------
// Leaf-node executors. The plugin composes execLeafFactory() per run with the
// concrete dependencies (app, settings snapshot, budget guard, usage recorder)
// so the runner core stays pure and this module stays testable with fakes.

import { costOf, DEFAULT_IMAGE_PRICE_USD } from './cost';
import type { PriceTable } from './cost';
import { imageInvoke, llmInvoke } from './providers';
import type { NodeDef, LeafResult } from './runner';
import { resolveTemplates } from './template';
import type { Scope } from './template';

export type LeafDeps = {
  app: any;
  prices: PriceTable;
  imagePriceUsd?: number;
  /** throws when the (configurable) daily budgets forbid another model call */
  guardModelCall: () => Promise<void>;
  /** roll usage/cost up onto the run row */
  recordUsage: (usage: { inputTokens: number; outputTokens: number }, costUsd: number) => void;
  defaultModel?: string;
  defaultService?: string;
};

const HTTP_TIMEOUT_MS = 45_000;

async function execHttp(node: NodeDef, scope: Scope): Promise<LeafResult> {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const method = String(cfg.method ?? 'GET').toUpperCase();
  const url = String(cfg.url ?? '');
  if (!/^https?:\/\//i.test(url)) throw new Error(`http node "${node.id}": invalid url`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(Number(cfg.timeoutMs) || HTTP_TIMEOUT_MS, 60_000));
  try {
    const headers: Record<string, string> = { ...(cfg.headers ?? {}) };
    let body: any;
    if (cfg.body != null && method !== 'GET' && method !== 'HEAD') {
      if (typeof cfg.body === 'string') {
        body = cfg.body;
      } else {
        body = JSON.stringify(cfg.body);
        if (!headers['Content-Type'] && !headers['content-type']) headers['Content-Type'] = 'application/json';
      }
    }
    const res = await fetch(url, { method, headers, body, signal: controller.signal });
    const text = await res.text();
    let parsed: any = text;
    if (String(cfg.responseType ?? 'json') === 'json') {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text; // tolerate non-JSON bodies
      }
    }
    if (!res.ok && cfg.failOnHttpError !== false) {
      throw new Error(`http node "${node.id}": ${method} ${res.status} ${String(text).slice(0, 200)}`);
    }
    return { output: { status: res.status, body: parsed } };
  } finally {
    clearTimeout(timer);
  }
}

async function execData(node: NodeDef, scope: Scope, deps: LeafDeps): Promise<LeafResult> {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const collection = String(cfg.collection ?? '');
  const repo = deps.app.db.getRepository(collection);
  if (!repo) throw new Error(`data node "${node.id}": unknown collection "${collection}"`);
  const op = String(cfg.op ?? 'list');
  if ((op === 'create' || op === 'update') && cfg.allowWrite !== true) {
    // Writes are opt-in per node — a workflow must EXPLICITLY declare intent
    // (and the human_gate node exists for runs that should pause before them).
    throw new Error(`data node "${node.id}": ${op} requires allowWrite:true`);
  }
  if (op === 'list') {
    const rows = await repo.find({
      filter: cfg.filter ?? {},
      limit: Math.min(Number(cfg.limit) || 20, 200),
      sort: cfg.sort,
    });
    return { output: { rows: rows.map((r: any) => r.toJSON?.() ?? r), count: rows.length } };
  }
  if (op === 'get') {
    const row = await repo.findOne({ filter: cfg.filter ?? {}, filterByTk: cfg.id });
    return { output: { row: row?.toJSON?.() ?? row ?? null } };
  }
  if (op === 'create') {
    const row = await repo.create({ values: cfg.values ?? {} });
    return { output: { id: row?.get?.('id') ?? null } };
  }
  if (op === 'update') {
    await repo.update({ filter: cfg.filter ?? {}, filterByTk: cfg.id, values: cfg.values ?? {} });
    return { output: { ok: true } };
  }
  throw new Error(`data node "${node.id}": unknown op "${op}"`);
}

async function execLlm(node: NodeDef, scope: Scope, deps: LeafDeps): Promise<LeafResult> {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const prompt = String(resolveTemplates(cfg.prompt ?? '', scope) ?? '');
  if (!prompt.trim()) throw new Error(`llm node "${node.id}": empty prompt`);
  const system = cfg.system ? String(resolveTemplates(cfg.system, scope)) : undefined;
  const res = await llmInvoke(deps.app, {
    service: cfg.service ?? deps.defaultService,
    model: cfg.model ?? deps.defaultModel,
    system,
    prompt,
    jsonSchema: cfg.jsonSchema,
    temperature: cfg.temperature,
    maxTokens: cfg.maxTokens,
  });
  const cost = costOf(res.model, res.usage, deps.prices);
  deps.recordUsage(res.usage, cost);
  if (cfg.jsonSchema && res.json === undefined) {
    throw new Error(`llm node "${node.id}": model returned no parseable JSON`);
  }
  return {
    output: { text: res.text, json: res.json, model: res.model, via: res.via },
    usage: res.usage,
    costUsd: cost,
  };
}

async function execImage(node: NodeDef, scope: Scope, deps: LeafDeps): Promise<LeafResult> {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const prompt = String(resolveTemplates(cfg.prompt ?? '', scope) ?? '');
  if (!prompt.trim()) throw new Error(`image node "${node.id}": empty prompt`);
  const imageDataUrl = cfg.image ? String(resolveTemplates(cfg.image, scope)) : undefined;
  const res = await imageInvoke(deps.app, { model: cfg.model, prompt, imageDataUrl });
  const cost = deps.imagePriceUsd ?? DEFAULT_IMAGE_PRICE_USD;
  deps.recordUsage(res.usage, cost);
  return {
    // Data URLs are big — steps truncate on persist; downstream nodes can
    // still consume {{nodes.<id>.imageDataUrl}} in-memory within the run.
    output: { imageDataUrl: res.imageDataUrl, model: res.model },
    usage: res.usage,
    costUsd: cost,
  };
}

function execTransform(node: NodeDef, scope: Scope): LeafResult {
  const map = node.config?.map ?? node.config ?? {};
  return { output: resolveTemplates(map, scope) };
}

function execHumanGate(node: NodeDef, scope: Scope): LeafResult {
  const message = String(resolveTemplates(node.config?.message ?? 'Approval required', scope) ?? '');
  return { suspend: true, output: { message } };
}

function execOutput(node: NodeDef, scope: Scope): LeafResult {
  const map = node.config?.map ?? node.config ?? {};
  return { output: resolveTemplates(map, scope), end: node.config?.end === true };
}

export function execLeafFactory(deps: LeafDeps) {
  return async (node: NodeDef, scope: Scope): Promise<LeafResult> => {
    switch (node.type) {
      case 'llm':
        return execLlm(node, scope, deps);
      case 'image':
        return execImage(node, scope, deps);
      case 'http':
        return execHttp(node, scope);
      case 'data':
        return execData(node, scope, deps);
      case 'transform':
        return execTransform(node, scope);
      case 'human_gate':
        return execHumanGate(node, scope);
      case 'output':
        return execOutput(node, scope);
      default:
        throw new Error(`unknown node type "${node.type}" (node "${node.id}")`);
    }
  };
}
