// test/collection-acl-gate.test.mjs
// -----------------------------------------------------------------------------------------------
// Bündel B — the hole that had no ticket: NeoAI's THIRTEEN COLLECTIONS were never taken out of
// `acl.strategyResources`, while its twenty-three ACTIONS were gated tightly.
//
// That asymmetry is why nobody saw it. Every audit of this plugin measured `neoai:<action>` and
// found 403 everywhere. Measured on `:13000` on 2026-07-31 with the eight-role probe account
// (`X-Role` per pass, each switch confirmed through `roles:check`):
//
//     architect / ceo / partner_success / project_lead / sales   neoai_settings:list    -> 200
//         and `gemini_api_key` came back in CLEAR — the sentinel was found five times
//     partner_success / project_lead / sales                     neoai_settings:update  -> 200
//     partner_success                                            neoai_workflows:create -> 200,
//         and the row really appeared
//
// The three guards below are what keep that shut, and they are three DIFFERENT failure modes:
//
//   1. the detachment stops happening (the gate itself),
//   2. the detachment happens ONCE and a later `collections` write silently reattaches,
//   3. the snippet stops covering a collection, which locks `admin` out instead of letting a
//      customer role in — the same drift, pointed the other way.
//
// `lib/neoaiConfigCollections.ts` imports nothing, so `node --test` runs the real thing.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
// `NEOAI_SRC` lets this file be pointed at a pre-change checkout, which is what makes the mutation
// probe an actual probe.
const srcRoot = process.env.NEOAI_SRC ? resolve(process.env.NEOAI_SRC) : resolve(root, 'src');
const read = (rel) => readFileSync(resolve(srcRoot, rel), 'utf8');

const { NEOAI_GATED_COLLECTIONS, neoaiSnippetActions, detachNeoaiCollectionsFromStrategy } =
  await import(new URL('../src/server/lib/neoaiConfigCollections.ts', import.meta.url).href);

/** Source text with `//` and block comments removed — so prose cannot pass for code. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// A stand-in for the ACL that records what was taken out of it. Nothing here needs a database:
// `strategyResources` is a plain Set on the ACL object and `removeStrategyResource` deletes from it.
function fakeAcl(names) {
  const strategyResources = names === null ? null : new Set(names);
  const removed = [];
  return {
    strategyResources,
    removeStrategyResource(name) {
      removed.push(name);
      strategyResources.delete(name);
    },
    removed,
  };
}

// ── 1. The gate ────────────────────────────────────────────────────────────────────────────────

test('every collection this plugin owns is taken out of the strategy path', () => {
  const acl = fakeAcl([...NEOAI_GATED_COLLECTIONS, 'crm_deals', 'konfigurator_options']);
  const removed = detachNeoaiCollectionsFromStrategy({ acl });

  assert.equal(removed, NEOAI_GATED_COLLECTIONS.length);
  for (const name of NEOAI_GATED_COLLECTIONS) {
    assert.equal(acl.strategyResources.has(name), false, `${name} must not stay a strategy resource`);
  }
  // …and nothing else is touched. A gate that also closes the neighbours is a different outage.
  assert.equal(acl.strategyResources.has('crm_deals'), true);
  assert.equal(acl.strategyResources.has('konfigurator_options'), true);
});

test('the secret-bearing collections are on the list, by name', () => {
  // Spelled out rather than derived, because these five are the reason the list exists and a
  // refactor that quietly drops one must fail here rather than on a customer's deployment.
  for (const name of ['neoai_settings', 'neoai_secrets', 'neoai_mcp_servers', 'neoai_workflows', 'neoai_workflow_versions']) {
    assert.ok(NEOAI_GATED_COLLECTIONS.includes(name), `${name} carries or executes a secret and must be gated`);
  }
});

test('the list matches the collections the plugin actually defines — no thirteenth left behind', () => {
  const declared = [...read('server/collections.ts').matchAll(/name: '(neoai_[a-z_]+)'/g)].map((m) => m[1]);
  const unique = [...new Set(declared)];
  assert.ok(unique.length >= 13, `expected at least 13 collections in the source, found ${unique.length}`);
  const missing = unique.filter((n) => !NEOAI_GATED_COLLECTIONS.includes(n));
  assert.deepEqual(
    missing,
    [],
    'A collection that is defined but not gated is reachable through the blanket strategy of every ' +
      'role that carries `view` — which is five of the eight non-admin roles on this deployment.',
  );
});

test('detachment is idempotent and survives an ACL that has nothing to give', () => {
  const acl = fakeAcl([...NEOAI_GATED_COLLECTIONS]);
  assert.equal(detachNeoaiCollectionsFromStrategy({ acl }), NEOAI_GATED_COLLECTIONS.length);
  assert.equal(detachNeoaiCollectionsFromStrategy({ acl }), 0, 'a second pass has nothing left to do');

  // `strategyResources === null` means "EVERY resource is a strategy resource" and the set is not
  // closable yet. Deleting from it would throw; doing nothing is correct, and the afterStart pass
  // is what covers it later.
  assert.equal(detachNeoaiCollectionsFromStrategy({ acl: fakeAcl(null) }), 0);
  assert.equal(detachNeoaiCollectionsFromStrategy({}), 0);
  assert.equal(detachNeoaiCollectionsFromStrategy(null), 0);
});

// ── 2. Once is not enough ──────────────────────────────────────────────────────────────────────

test('the detachment is wired to load, afterStart AND the collection events', () => {
  // The measured reason: a single boot re-attached 27 (crm) / 42 (design-studio) / 9 (gdrive-sync)
  // times, because writing a `collections` row triggers afterDefineCollection →
  // appendStrategyResource. A one-shot removal is undone before the first request arrives.
  const plugin = read('server/plugin.ts');
  assert.match(plugin, /detach\('load'\)/, 'load');
  assert.match(plugin, /detach\('afterStart'\)/, 'afterStart');
  assert.match(plugin, /this\.db\.on\('afterDefineCollection', \(\) => detach\('afterDefineCollection'\)\)/);
  assert.match(plugin, /this\.db\.on\('afterUpdateCollection', \(\) => detach\('afterUpdateCollection'\)\)/);
});

test('the afterStart detachment runs AFTER the boot sweeps that write meta rows', () => {
  // COMMENTS STRIPPED FIRST, like the `acl.allow` census further down, and for the
  // same measured reason: on 2026-08-05 the boot definition sweep landed with an
  // explanatory comment that NAMES `detach('afterStart')` — it explains why the
  // sweep is registered before it — and this guard, reading raw text, found the
  // prose instead of the statement and turned red on correct code. A guard that
  // cannot tell code from prose forces the deletion of exactly the comments that
  // carry the reason ([[kommentar-entferner-in-waechtern]]).
  const plugin = stripComments(read('server/plugin.ts'));
  const afterStartAt = plugin.indexOf("this.app.on('afterStart'");
  const detachAt = plugin.indexOf("detach('afterStart')");
  assert.ok(afterStartAt > -1 && detachAt > afterStartAt,
    'the detachment must sit inside the afterStart handler, so it has the last word');
  // And it must be the LAST afterStart handler to touch the strategy: any sweep
  // registered after it would re-append the collection names behind its back.
  assert.ok(plugin.indexOf("this.app.on('afterStart'", detachAt) === -1,
    'no afterStart handler may be registered after the one that detaches');
});

// ── 3. The snippet must still open the door for whoever holds it ───────────────────────────────

test('the snippet covers every gated collection AND the action resource', () => {
  const actions = neoaiSnippetActions();
  assert.ok(actions.includes('neoai:*'), 'the twenty-three custom actions');
  for (const name of NEOAI_GATED_COLLECTIONS) {
    assert.ok(actions.includes(`${name}:*`), `${name} — otherwise detaching it locks admin out too`);
  }
  assert.equal(actions.length, NEOAI_GATED_COLLECTIONS.length + 1, 'derived, so it cannot carry a stale name');
});

test('`neoai:*` does NOT cover a collection action — which is why the list is derived', () => {
  // The glob boundary that made the CRM snippet cover nothing for a year. `neoai:*` matches
  // `neoai:getSettings`; it does not match `neoai_settings:list`, because the resource names differ.
  const actions = neoaiSnippetActions();
  assert.ok(!actions.filter((a) => a === 'neoai:*').some(() => 'neoai_settings:list'.startsWith('neoai:')),
    'sanity: the two resource names are genuinely different strings');
  assert.ok('neoai_settings:list'.startsWith('neoai_'), 'sanity');
  assert.ok(!'neoai_settings:list'.startsWith('neoai:'), 'sanity — this is the whole trap');
});

test('the plugin registers the DERIVED action list, not a hand-written one', () => {
  const plugin = read('server/plugin.ts');
  assert.match(plugin, /registerSnippet\(\{ name: NEOAI_ADMIN_SNIPPET, actions: neoaiSnippetActions\(\) \}\)/,
    'a literal list here is how the two halves drift apart');
});

test('nothing hands a neoai COLLECTION to logged-in callers', () => {
  // The paragraph at the bottom of neoaiConfigCollections.ts says a field allowlist is unnecessary
  // *because* nothing is granted. This is that sentence, as a check. The moment someone adds such a
  // grant, this fails and the allowlist has to land in the same commit.
  // Comments stripped first: the note above the grant QUOTES the blanket call this ticket removed,
  // and a source-text check that cannot tell code from prose is not a check.
  const plugin = stripComments(read('server/plugin.ts'));
  const grants = [...plugin.matchAll(/acl\.allow\(\s*'([^']+)'/g)].map((m) => m[1]);
  const onCollections = grants.filter((r) => r.startsWith('neoai_'));
  assert.deepEqual(onCollections, [],
    'a logged-in grant on a neoai collection needs a field allowlist in the same commit (recipe part 3)');
  assert.deepEqual(grants, ['neoai'], 'the only grant is the open action resource');
});
