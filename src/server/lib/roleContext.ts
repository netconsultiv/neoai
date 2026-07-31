// src/server/lib/roleContext.ts
// -----------------------------------------------------------------------------
// Who is on this request, and may they operate NeoAI?
//
// Lived in `env.ts` until ticket 13c027fa. It never belonged there: `env.ts` answers "what did the
// operator put in the environment", this answers "what did the ACL decide about this caller" —
// and the two were sharing a file only because both were one-liners. Its own module also means it
// imports NOTHING, so `node --test` exercises the real gate instead of a copy of it.
//
// ── TWO DEFECTS ARE CLOSED HERE (ticket 13c027fa) ────────────────────────────────────────────────
//
// 1. ROLE SWITCHING DID NOT WORK. The old gate was:
//
//        const role = String(ctx?.state?.currentRole ?? '');
//        if (ADMIN_ROLES.has(role)) return true;
//        // Fallback: some auth paths populate roles on the user instead.
//        const roles: any[] = ctx?.state?.currentUser?.roles ?? [];
//        return roles.some((r) => ADMIN_ROLES.has(String(r?.name ?? r)));
//
//    The comment's premise is false. `@nocobase/plugin-acl`'s `setCurrentRole.js:75` sets
//    `ctx.state.currentUser.roles = userRoles` on EVERY authenticated request — it is not a
//    fallback for exotic auth paths, it is the account's full MEMBERSHIP LIST, written
//    unconditionally and independently of `X-Role`. So the second line always ran, and it always
//    saw every role the account holds. Measured on :13000, one account, one token, 2026-07-31:
//
//        user 1 holds root,admin,pdf_operator,architect,member
//        X-Role: member    → neoai:secretsList 200   ← switched to a non-admin role, still admin
//        X-Role: architect → neoai:secretsList 200
//        control account holding eight NON-admin roles, any of them → 403
//
//    The control is the proof: it was account membership, never the active role.
//
// 2. THE ADMIN LIST WAS HARDCODED. `ADMIN_ROLES = new Set(['root', 'admin'])` decides policy in
//    code that a deployment cannot see or change, and it silently disagrees with the ACL — the
//    plugin already registers the snippet `pm.neoai.settings`, so the deployment had ALREADY said
//    who may operate NeoAI, in the place built for saying it, and the code ignored the answer.
//    "admin" is not a magic word; it is whichever roles carry the grant. Now the ACL is asked.

/** The snippet that owns NeoAI's admin surface. Must stay identical to the name `plugin.ts` hands
 *  to `acl.registerSnippet` — that registration is what defines the snippet, this constant is what
 *  the gate below asks about, and a typo in either makes the gate answer about a snippet nobody
 *  holds (i.e. refuse everyone). There is deliberately no client-side counterpart: NeoAI's console
 *  is mounted as nested admin routes rather than through `pluginSettingsManager`, so it has no
 *  `aclSnippet` to keep in step. */
export const NEOAI_ADMIN_SNIPPET = 'pm.neoai.settings';

/**
 * The roles the SERVER resolved as ACTIVE for this request.
 *
 * Mirrors `@nocobase/acl/lib/acl.js:302` exactly —
 *
 *     const roles = ctx.state.currentRoles || [ctx.state.currentRole || 'anonymous'];
 *
 * — so it cannot drift from the derivation the ACL middleware itself ran a moment earlier. The
 * same function, deliberately in the same shape, lives in
 * `pdf-generator/src/server/roleContext.ts` and `design-studio/src/server/operatorAcl.ts`: two
 * plugins answering "which role is this?" differently is how defect 1 above gets reintroduced one
 * plugin at a time.
 *
 * `X-Role` is CLIENT INPUT and is never read here. `setCurrentRole` validates it against the
 * account's real memberships (401 `ROLE_NOT_FOUND_FOR_USER` otherwise) and publishes the verdict
 * on `ctx.state`; only the verdict is read.
 *
 * ROLE-UNION MODE IS NOT A BUG. With `roleMode = onlyUseUnion`, or on the `__union__` pseudo-role,
 * NocoBase deliberately fills `currentRoles` with ALL of the account's roles — there the union IS
 * the active role and the ACL evaluates it identically. Reading `currentRoles` stays correct in
 * both modes, which is precisely why it is the right source and `currentUser.roles` is not.
 * `__union__` itself is dropped: no permission is ever granted on the pseudo-role.
 *
 * Fails CLOSED: nothing resolvable ⇒ empty list ⇒ not an admin.
 */
export function rolesOfContext(ctx: any): string[] {
  const raw = ctx?.state?.currentRoles;
  const list: any[] = Array.isArray(raw) && raw.length ? raw : [ctx?.state?.currentRole];
  const names: string[] = [];
  for (const entry of list) {
    const name = typeof entry === 'string' ? entry : (entry as any)?.name ?? (entry as any)?.role;
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed || trimmed === '__union__') continue;
    if (!names.includes(trimmed)) names.push(trimmed);
  }
  return names;
}

/** The action this request is really asking for, as the ACL spells it. Falls back to the wildcard
 *  the snippet is registered with, so a call made outside an action context is still answerable
 *  (and still answered by the snippet, not by a guess). */
export function neoaiActionPath(ctx: any): string {
  const action = ctx?.action?.actionName;
  return `neoai:${typeof action === 'string' && action.trim() ? action.trim() : '*'}`;
}

/**
 * May this caller operate NeoAI?
 *
 * Asked of the SNIPPET rather than of `acl.can()`, for the reason design-studio's `isOperator`
 * documents: `snippetAllowed()` answers `true` only for a role that really carries the grant,
 * `false` for one that rejects it (`!pm.*`), and `null` for one that mentions neither — and `null`
 * must not pass. `can()` would additionally consult the role's blanket STRATEGY, and a strategy
 * carrying `["view","create","update"]` (which `sales`, `partner_success` and `project_lead` are
 * shipped with) is exactly the widening this gate exists to refuse.
 *
 * `root` is short-circuited the way the framework does it itself — `@nocobase/acl/lib/acl.js`
 * `getCanByRole()` returns a grant for `root` before consulting anything else — so this gate
 * agrees with `can()` even on a deployment whose `root` row carries no snippets. That is the one
 * role name in this file, and it is a framework invariant being mirrored, not a policy decision
 * being taken.
 *
 * Fails CLOSED on every uncertainty: no ACL, no roles, no explicit `true` ⇒ not an admin.
 */
export function isAdminCtx(acl: any, ctx: any): boolean {
  if (!acl || typeof acl.getRole !== 'function') return false;
  const actionPath = neoaiActionPath(ctx);
  for (const role of rolesOfContext(ctx)) {
    if (role === 'root') return true;
    let verdict: unknown = null;
    try {
      verdict = acl.getRole(role)?.snippetAllowed?.(actionPath);
    } catch {
      verdict = null;
    }
    if (verdict === true) return true;
  }
  return false;
}
