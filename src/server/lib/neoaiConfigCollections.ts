// src/server/lib/neoaiConfigCollections.ts
// -----------------------------------------------------------------------------------------------
// THE GATE for this plugin's thirteen collections — the part a snippet cannot do.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// HOW THIS WAS FOUND (Bündel B, 2026-07-31) — it had no ticket
// ────────────────────────────────────────────────────────────────────────────────────────────────
// This defect class has been repaired FIVE times in this product: konfigurator (#97), pdf-generator
// (#10), crm (#27), gdrive-sync (#3), design-studio (#11). NeoAI is the one plugin that was never
// done — and nobody noticed, because NeoAI's twenty-three ACTIONS are gated tightly and everyone
// (including this plugin's own audits) measured the actions.
//
// The collections behind them were wide open. Measured on `:13000` with the eight-role probe
// account, one token, `X-Role` per pass, `roles:check` confirming each switch:
//
//     architect / ceo / partner_success / project_lead / sales   neoai_settings:list      -> 200
//         …with `gemini_api_key` in CLEAR — the sentinel came back for all five
//     partner_success / project_lead / sales                     neoai_settings:update    -> 200
//     partner_success                                            neoai_workflows:create   -> 200
//         …and a row really appeared (project_lead / sales got 400 "Key already exists",
//         which by the project's own counting rule is ALSO "let through")
//     …the same 200s on all thirteen collections, incl. neoai_secrets (the AES-GCM vault) and
//     neoai_mcp_servers (which carries the auth_secret association).
//
// `neoai_workflows` is not configuration in the harmless sense: a workflow definition is what the
// runner EXECUTES, including its HTTP steps and its function calls. Write access there is closer to
// code execution than to a setting. And none of those five roles held a single
// `dataSourcesRolesResources` row — it was purely the blanket strategy
// (`{"actions":["view","create","update"]}`) that `crm/src/server/modules/access.ts` ships.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// WHY A SNIPPET COULD NEVER HAVE CLOSED IT
// ────────────────────────────────────────────────────────────────────────────────────────────────
// `@nocobase/acl/lib/acl.js`, `can()`:
//
//     237:  if (!roleStrategy && !snippetAllowed) return null;
//     241:  if (this.strategyResources === null || this.strategyResources.has(resource)) {
//     242:    roleStrategyParams = roleStrategy?.allow(resource, this.resolveActionAlias(action));
//     243:  }
//     244:  if (!roleStrategyParams && snippetAllowed) { roleStrategyParams = {}; }
//
// **Strategy OR snippet — never AND.** A snippet is a second, independent yes-branch: it can only
// ADD. The one lever that closes the strategy path for a resource is its ABSENCE from
// `acl.strategyResources`, and a collection lands in that set through
// `@nocobase/plugin-acl/dist/server/server.js:611` the moment it has a row in the `collections`
// meta table (`loadedFromCollectionManager`).
//
// So the fix is FOUR parts and only works as four (project memory
// `nocobase-acl-snippets-und-strategy` §2):
//
//   1. the snippet's action list must be DERIVED from the collection list below, never hand-kept —
//      `pm.neoai.settings` used to cover `neoai:*` only, so detaching the collections without
//      widening it would have locked `admin` out of its own console;
//   2. no blanket `acl.allow(collection, '*', 'loggedIn')` — there is none here and none is wanted;
//   3. a field allowlist is only needed where something IS handed to a non-privileged reader; see
//      the note at the bottom — nothing is, so there is deliberately no middleware;
//   4. `removeStrategyResource` — on load, on afterStart, AND on every collection define/update.
//      Part 4 is the gate. Without it 1–3 are decoration.
//
// ────────────────────────────────────────────────────────────────────────────────────────────────
// DO NOT "heal" a deployment by DELETING a `collections` meta row
// ────────────────────────────────────────────────────────────────────────────────────────────────
// `collections.afterDestroy` in `@nocobase/plugin-data-source-main` removes the collection from the
// live `db` AND DROPS ITS PHYSICAL TABLE (measured on a throwaway stack, ticket 2abcb4a3). Here
// that would be every workflow, every run and the encrypted secrets vault. Existing deployments are
// closed at RUNTIME, by the function below.

/**
 * Every collection this plugin owns. All thirteen are administration, audit or execution surfaces;
 * none of them is business data that another plugin's roles are meant to reach through a blanket
 * strategy.
 *
 *  · `neoai_workflows` / `neoai_workflow_versions` — what the runner EXECUTES. Write access here is
 *    closer to code execution than to configuration: a definition carries HTTP steps and function
 *    calls.
 *  · `neoai_settings`   — `gemini_api_key` in clear, plus the budget and price policy.
 *  · `neoai_secrets`    — the AES-256-GCM vault (`value_encrypted`). Encrypted at rest, which is not
 *                         a reason to hand the rows to a customer-facing role.
 *  · `neoai_mcp_servers`— endpoints plus the `auth_secret` association into that vault.
 *  · `neoai_runs` / `neoai_run_steps` — other people's prompts, inputs and model output.
 *  · `neoai_functions`  — the callable surface the agent node is allowed to reach.
 *  · `neoai_memories` / `neoai_knowledge_*` / `neoai_prompts` — the retrieval corpus.
 *
 * Kept in step with the snippet in `plugin.ts` by `test/collection-acl-gate.test.mjs`: the snippet's
 * actions are DERIVED from this list, so a fourteenth collection cannot be gated in one place and
 * forgotten in the other. That is the exact mistake the CRM snippet made for a year (`crm:*` does
 * not glob-match `crm_settings:list`).
 */
export const NEOAI_GATED_COLLECTIONS = [
  'neoai_workflows',
  'neoai_workflow_versions',
  'neoai_functions',
  'neoai_runs',
  'neoai_run_steps',
  'neoai_settings',
  'neoai_memories',
  'neoai_secrets',
  'neoai_mcp_servers',
  'neoai_knowledge_articles',
  'neoai_prompts',
  'neoai_knowledge_links',
  'neoai_knowledge_suggestions',
] as const;

/**
 * The action globs the snippet must carry so that a snippet holder can still use the console.
 *
 * Derived, never hand-written. `neoai:*` is the action resource (the twenty-three custom actions);
 * the rest is one glob per collection, because a collection action is `neoai_settings:list` and
 * `neoai:*` does not match it — a glob boundary that has already cost this product a year of a
 * CRM snippet quietly covering nothing.
 */
export function neoaiSnippetActions(): string[] {
  return ['neoai:*', ...NEOAI_GATED_COLLECTIONS.map((name) => `${name}:*`)];
}

/**
 * Removes this plugin's collections from `acl.strategyResources`, and returns how many were
 * actually in there.
 *
 * Idempotent and defensive. `strategyResources` is `null` until the first `appendStrategyResource()`
 * anywhere in the app, and `null` means "EVERY resource is a strategy resource" — deleting from it
 * would throw, and while it is still `null` the set is not closable at all, so there is nothing
 * useful to do yet. Core plugins populate it long before this runs; the `afterStart` and
 * `afterDefineCollection` re-applications cover the rest.
 *
 * CALL IT FROM THREE PLACES. A one-shot removal at load is silently undone: writing a `collections`
 * row triggers `collection.load()` → `afterDefineCollection` → `appendStrategyResource`. A single
 * boot has been measured re-attaching 27 (crm) / 42 (design-studio) / 9 (gdrive-sync) times.
 */
export function detachNeoaiCollectionsFromStrategy(app: any): number {
  const acl: any = app?.acl;
  if (!acl || !acl.strategyResources || typeof acl.removeStrategyResource !== 'function') return 0;
  let removed = 0;
  for (const name of NEOAI_GATED_COLLECTIONS) {
    if (acl.strategyResources.has(name)) {
      acl.removeStrategyResource(name);
      removed++;
    }
  }
  return removed;
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THERE IS NO FIELD-ALLOWLIST MIDDLEWARE HERE
// ────────────────────────────────────────────────────────────────────────────────────────────────
// Part 3 of the recipe exists for the case where a collection IS handed to a non-privileged reader
// for a product reason — konfigurator does that with `konfigurator_plugin_settings` because a
// customer-facing drawer reads one flag out of it. This plugin grants nothing of the sort: the only
// `acl.allow` it issues is `neoai:access`, an action. With the strategy path closed there is no
// non-privileged reader left to project for, and a middleware guarding an unreachable path is dead
// code that reads like protection.
//
// **If a future change adds `acl.allow('neoai_<something>', …, 'loggedIn')`, this paragraph stops
// being true and the allowlist must land in the same commit.** `test/collection-acl-gate.test.mjs`
// pins that pairing so the two cannot drift apart in silence.
