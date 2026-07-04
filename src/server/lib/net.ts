// src/server/lib/net.ts
// -----------------------------------------------------------------------------
// SSRF guard shared by every leaf that lets an admin-authored workflow reach
// out over HTTP with the SERVER's network privileges: the `http` node and the
// `mcp_tool` node (src/server/lib/mcp.ts). Extracted to its own module (no
// dependency on nodes.ts or mcp.ts) so neither has to import the other.

// Private/loopback/link-local targets are blocked unless the caller explicitly
// opts in (allowPrivate:true) — default-deny is the right default given the
// server's own network reach.
const PRIVATE_HOST_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|fd[0-9a-f]{2}:)/i;

export function isPrivateHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return PRIVATE_HOST_RE.test(host) || host.endsWith('.internal') || host.endsWith('.local');
  } catch {
    return true;
  }
}
