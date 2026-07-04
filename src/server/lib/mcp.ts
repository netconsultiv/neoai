// src/server/lib/mcp.ts
// -----------------------------------------------------------------------------
// Standalone MCP (Model Context Protocol) HTTP-transport client — a JSON-RPC
// 2.0 `tools/call` POST against a registered `neoai_mcp_servers` row. Factored
// as a free function (not inlined in the node executor) because batch G's
// agent node imports it directly for tool-dispatch (per the plan).
//
// Same SSRF guard + timeout conventions as the existing `http` leaf node
// (isPrivateHost, default-deny private/loopback hosts, allowPrivate:true
// escape hatch) — admin-authored workflows run with the SERVER's network
// reach, so default-deny is the safe default.

import { isPrivateHost } from './net.ts';

const MCP_TIMEOUT_MS = 45_000;

export type McpCallOptions = {
  timeoutMs?: number;
  allowPrivate?: boolean;
};

export type McpCallResult = {
  result?: any;
  isError?: boolean;
};

let rpcIdCounter = 0;

/**
 * Call `tools/call` on an MCP HTTP-transport server. Throws on transport
 * errors, non-2xx HTTP, or a JSON-RPC `error` member. `authHeader`/`authValue`
 * are optional (e.g. authHeader:"Authorization", authValue:"Bearer sk-...").
 */
export async function callMcpTool(
  serverUrl: string,
  toolName: string,
  args: Record<string, any> = {},
  authHeader?: string,
  authValue?: string,
  opts: McpCallOptions = {},
): Promise<McpCallResult> {
  if (!/^https?:\/\//i.test(String(serverUrl ?? ''))) {
    throw new Error(`mcp: invalid server url "${serverUrl}"`);
  }
  if (opts.allowPrivate !== true && isPrivateHost(serverUrl)) {
    throw new Error(`mcp: private/internal target blocked (set allowPrivate:true to permit)`);
  }
  if (!toolName) throw new Error('mcp: toolName is required');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(opts.timeoutMs || MCP_TIMEOUT_MS, 60_000));
  try {
    rpcIdCounter += 1;
    const body = {
      jsonrpc: '2.0',
      id: rpcIdCounter,
      method: 'tools/call',
      params: { name: toolName, arguments: args ?? {} },
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (authHeader && authValue) headers[authHeader] = authValue;

    const res = await fetch(serverUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`mcp: ${toolName} → HTTP ${res.status} ${String(text).slice(0, 200)}`);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`mcp: ${toolName} → non-JSON response: ${String(text).slice(0, 200)}`);
    }
    if (parsed?.error) {
      throw new Error(`mcp: ${toolName} → ${parsed.error.message ?? JSON.stringify(parsed.error)}`);
    }
    return { result: parsed?.result, isError: parsed?.result?.isError === true };
  } finally {
    clearTimeout(timer);
  }
}
