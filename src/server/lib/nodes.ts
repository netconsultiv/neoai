// src/server/lib/nodes.ts
// -----------------------------------------------------------------------------
// Leaf-node executors. The plugin composes execLeafFactory() per run with the
// concrete dependencies (app, settings snapshot, budget guard, usage recorder)
// so the runner core stays pure and this module stays testable with fakes.

import { costOf, DEFAULT_IMAGE_PRICE_USD } from './cost';
import type { PriceTable } from './cost';
import { callMcpTool } from './mcp';
import { isPrivateHost } from './net';
import { imageInvoke, llmInvoke } from './providers';
import type { NodeDef, LeafResult } from './runner';
import { resolveTemplates } from './template';
import type { Scope } from './template';

// Re-exported for backward compatibility (existing call sites/tests may still
// import isPrivateHost from here) — the real implementation now lives in
// ./net so it can be shared with mcp.ts without a circular import.
export { isPrivateHost };

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
  /** name → decrypted value, built ONCE at executeRun start (item 13/11) */
  secrets?: Record<string, string>;
};

const HTTP_TIMEOUT_MS = 45_000;

async function execHttp(node: NodeDef, scope: Scope): Promise<LeafResult> {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const method = String(cfg.method ?? 'GET').toUpperCase();
  const url = String(cfg.url ?? '');
  if (!/^https?:\/\//i.test(url)) throw new Error(`http node "${node.id}": invalid url`);
  if (cfg.allowPrivate !== true && isPrivateHost(url)) {
    throw new Error(`http node "${node.id}": private/internal target blocked (set allowPrivate:true to permit)`);
  }
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

// mcp_tool: thin wrapper around callMcpTool (src/server/lib/mcp.ts). Looks up
// the registered neoai_mcp_servers row by id (the config carries the row id,
// not a freehand URL — owner's explicit "registered-server picker" call), then
// resolves the row's auth_secret association against the scope.secrets map
// that executeRun decrypted ONCE at run start (one decrypt pass per run, not
// per MCP call — see plugin.ts's executeRun / src/server/lib/secrets.ts).
async function execMcpTool(node: NodeDef, scope: Scope, deps: LeafDeps): Promise<LeafResult> {
  const cfg = resolveTemplates(node.config ?? {}, scope);
  const serverId = cfg.serverId ?? cfg.server_id;
  if (!serverId) throw new Error(`mcp_tool node "${node.id}": serverId is required`);
  const toolName = String(cfg.toolName ?? '');
  if (!toolName) throw new Error(`mcp_tool node "${node.id}": toolName is required`);
  const repo = deps.app.db.getRepository('neoai_mcp_servers');
  if (!repo) throw new Error(`mcp_tool node "${node.id}": neoai_mcp_servers collection unavailable`);
  const serverRow = await repo.findOne({ filterByTk: Number(serverId), appends: ['auth_secret'] });
  if (!serverRow) throw new Error(`mcp_tool node "${node.id}": MCP server ${serverId} not found`);
  const serverUrl = String(serverRow.get('url') ?? '');
  const authHeader = String(serverRow.get('auth_header') ?? '') || undefined;
  let authValue: string | undefined;
  const secretRow = serverRow.get('auth_secret');
  const secretName = secretRow?.name ?? secretRow?.get?.('name');
  if (secretName) authValue = deps.secrets?.[String(secretName)];
  const args = cfg.args && typeof cfg.args === 'object' ? cfg.args : {};
  const res = await callMcpTool(serverUrl, toolName, args, authHeader, authValue, { allowPrivate: cfg.allowPrivate === true });
  return { output: res };
}

// agent_decide: the per-turn "decide" step of an agent node (item 20),
// synthesized inline by runner.ts's drive() — NOT a node type an author picks
// directly. Calls the SAME guardModelCall() budget guard every llm node
// respects, then forces a JSON-schema response so the caller (runner.ts) can
// branch on {action, tool, args, finalOutput} without any text-parsing.
const AGENT_DECIDE_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['call_tool', 'finish'] },
    tool: { type: 'string' },
    args: { type: 'object' },
    reasoning: { type: 'string' },
    finalOutput: {},
  },
  required: ['action', 'reasoning'],
};

async function execAgentDecide(node: NodeDef, scope: Scope, deps: LeafDeps): Promise<LeafResult> {
  await deps.guardModelCall();
  const cfg = node.config ?? {};
  const goal = String(cfg.goal ?? '');
  const tools = Array.isArray(cfg.tools) ? cfg.tools : [];
  const toolsDesc = tools.map((t: any) => `- ${t.name} (${t.type}): ${t.description || 'no description'}`).join('\n');
  const observations = String(cfg.observations ?? '');
  const system = String(
    resolveTemplates(
      cfg.systemPrompt ??
        'You are an autonomous agent. Decide the next action: either call one of the available tools, or finish with a final output. Respond ONLY with the requested JSON.',
      scope,
    ) ?? '',
  );
  const prompt = [
    `Goal: ${goal}`,
    tools.length ? `Available tools:\n${toolsDesc}` : 'No tools are available.',
    observations ? `Observations so far:${observations}` : 'No observations yet — this is the first turn.',
    'Decide the next action. If you have enough information to satisfy the goal, use action "finish" and set finalOutput. Otherwise use action "call_tool", set "tool" to one of the available tool names, and "args" to the arguments object for that tool.',
  ].join('\n\n');

  const res = await llmInvoke(deps.app, {
    service: cfg.service ?? deps.defaultService,
    model: cfg.model ?? deps.defaultModel,
    system,
    prompt,
    jsonSchema: AGENT_DECIDE_SCHEMA,
    temperature: cfg.temperature ?? 0.1,
  });
  const cost = costOf(res.model, res.usage, deps.prices);
  deps.recordUsage(res.usage, cost);
  if (res.json === undefined) {
    throw new Error(`agent_decide node "${node.id}": model returned no parseable JSON`);
  }
  return {
    output: { text: res.text, json: res.json, model: res.model, via: res.via },
    usage: res.usage,
    costUsd: cost,
  };
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
      case 'mcp_tool':
        return execMcpTool(node, scope, deps);
      case 'agent_decide':
        return execAgentDecide(node, scope, deps);
      case 'human_gate':
        return execHumanGate(node, scope);
      case 'output':
        return execOutput(node, scope);
      default:
        throw new Error(`unknown node type "${node.type}" (node "${node.id}")`);
    }
  };
}
