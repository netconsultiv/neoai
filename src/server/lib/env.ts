// src/server/lib/env.ts
// -----------------------------------------------------------------------------
// Single env-flag gate for sandbox-only behaviour (mock providers, seeds that
// must never reach staging). Same design as CRM's CRM_SANDBOX: the flag ALONE
// decides — never DB state, which any admin could mutate. Pure + injectable so
// tests never touch the real process.env.

export function isSandbox(env: Record<string, string | undefined> = process.env): boolean {
  const v = String(env.NEOAI_SANDBOX ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

// The admin gate used to live here as `isAdminCtx` + a hardcoded `ADMIN_ROLES` set. Both moved to
// `./roleContext` in ticket 13c027fa: it read the account's whole role list instead of the ACTIVE
// role (so switching roles did nothing), and it decided in code a policy the ACL already owned.
// Nothing is re-exported from here on purpose — a stale import must fail the build, not silently
// resolve to something that no longer exists.
