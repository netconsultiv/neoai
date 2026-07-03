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

/** Roles allowed into the NeoAI console/actions for now (owner: "admin only"). */
export const ADMIN_ROLES = new Set(['root', 'admin']);

export function isAdminCtx(ctx: any): boolean {
  const role = String(ctx?.state?.currentRole ?? '');
  if (ADMIN_ROLES.has(role)) return true;
  // Fallback: some auth paths populate roles on the user instead.
  const roles: any[] = ctx?.state?.currentUser?.roles ?? [];
  return roles.some((r: any) => ADMIN_ROLES.has(String(r?.name ?? r)));
}
