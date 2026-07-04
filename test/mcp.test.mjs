import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { callMcpTool } from '../src/server/lib/mcp.ts';
import { isPrivateHost } from '../src/server/lib/net.ts';

// --- SSRF guard (same convention as the http node's isPrivateHost) ---------

test('isPrivateHost blocks loopback/private/link-local targets', () => {
  for (const url of [
    'http://127.0.0.1/x',
    'http://localhost:3000/x',
    'http://0.0.0.0/x',
    'http://10.0.0.5/x',
    'http://192.168.1.1/x',
    'http://169.254.169.254/latest/meta-data',
    'http://172.16.0.1/x',
    'http://foo.internal/x',
    'http://bar.local/x',
  ]) {
    assert.equal(isPrivateHost(url), true, `expected ${url} to be blocked`);
  }
});

test('isPrivateHost allows ordinary public hosts', () => {
  for (const url of ['https://example.com/mcp', 'https://api.githubcopilot.com/mcp', 'http://172.32.0.1/x']) {
    assert.equal(isPrivateHost(url), false, `expected ${url} to be allowed`);
  }
});

test('callMcpTool rejects a private target by default', async () => {
  await assert.rejects(() => callMcpTool('http://127.0.0.1:9/tools', 'anyTool', {}), /private\/internal target blocked/);
});

test('callMcpTool permits a private target with allowPrivate:true (still fails to connect, but past the guard)', async () => {
  // Port 1 is reserved/unlikely to have a listener — we only assert the SSRF
  // guard itself didn't fire; the resulting error is a connection failure.
  await assert.rejects(
    () => callMcpTool('http://127.0.0.1:1/tools', 'anyTool', {}, undefined, undefined, { allowPrivate: true, timeoutMs: 500 }),
    (err) => !/private\/internal target blocked/.test(String(err?.message)),
  );
});

test('callMcpTool rejects an invalid url', async () => {
  await assert.rejects(() => callMcpTool('not-a-url', 'anyTool', {}), /invalid server url/);
});

test('callMcpTool requires a toolName', async () => {
  await assert.rejects(() => callMcpTool('https://example.com/mcp', '', {}), /toolName is required/);
});

// --- JSON-RPC 2.0 tools/call shape, against a local HTTP server -----------

function withServer(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}/mcp` });
    });
  });
}

test('callMcpTool posts a JSON-RPC 2.0 tools/call body and returns the result', async () => {
  let received = null;
  const { server, url } = await withServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received = { headers: req.headers, json: JSON.parse(body) };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: received.json.id, result: { content: [{ type: 'text', text: 'ok' }] } }));
    });
  });
  try {
    const res = await callMcpTool(url, 'search', { query: 'hello' }, 'Authorization', 'Bearer secret-token', { allowPrivate: true });
    assert.equal(received.json.jsonrpc, '2.0');
    assert.equal(received.json.method, 'tools/call');
    assert.deepEqual(received.json.params, { name: 'search', arguments: { query: 'hello' } });
    assert.equal(received.headers['authorization'], 'Bearer secret-token');
    assert.deepEqual(res.result, { content: [{ type: 'text', text: 'ok' }] });
    assert.equal(res.isError, false);
  } finally {
    server.close();
  }
});

test('callMcpTool throws on a JSON-RPC error member', async () => {
  const { server, url } = await withServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const rpc = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: 'Method not found' } }));
    });
  });
  try {
    await assert.rejects(() => callMcpTool(url, 'missingTool', {}, undefined, undefined, { allowPrivate: true }), /Method not found/);
  } finally {
    server.close();
  }
});

test('callMcpTool throws on non-2xx HTTP status', async () => {
  const { server, url } = await withServer((req, res) => {
    req.resume();
    res.writeHead(500);
    res.end('boom');
  });
  try {
    await assert.rejects(() => callMcpTool(url, 'anyTool', {}, undefined, undefined, { allowPrivate: true }), /HTTP 500/);
  } finally {
    server.close();
  }
});

test('callMcpTool omits the auth header when no secret value is supplied', async () => {
  let received = null;
  const { server, url } = await withServer((req, res) => {
    received = req.headers;
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const rpc = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id, result: {} }));
    });
  });
  try {
    await callMcpTool(url, 'search', {}, 'Authorization', undefined, { allowPrivate: true });
    assert.equal(received['authorization'], undefined);
  } finally {
    server.close();
  }
});
