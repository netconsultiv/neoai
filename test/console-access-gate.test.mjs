// test/console-access-gate.test.mjs
// -----------------------------------------------------------------------------------------------
// Tickets b4f8730e and 7466a838 — one defect seen from its two ends.
//
//   b4f8730e:  the console is mounted as nested admin routes, not through `pluginSettingsManager`,
//              so NocoBase's `/admin/settings/**` gate never covered it. Every logged-in user could
//              open `/admin/neoai`, and on the measured deployment `member` and `sales` carry the
//              menu entry — so the reach was not even "whoever knows the URL".
//   7466a838:  and what they reached was not a refusal. The shell mounted, every panel fired its
//              load, the server answered 403 to all of them, and the surface then sat on
//              "Loading…" forever while the workflow list said "No workflows yet".
//
// The fix has three moving parts and each of them is pinned below:
//
//   · the SERVER answers the question (`neoai:access`), because the client cannot: the answer lives
//     in the role snippet, and evaluating that needs the whole snippet registry;
//   · the gate became a LAYER instead of twenty-three first lines, so action twenty-four is refused
//     without anyone having to remember;
//   · the CLIENT gates the shell, not the eight panels — which is what makes "no polling after a
//     403" true by construction rather than by discipline.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcRoot = process.env.NEOAI_SRC ? resolve(process.env.NEOAI_SRC) : resolve(root, 'src');
const read = (rel) => readFileSync(resolve(srcRoot, rel), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const {
  NEOAI_OPEN_ACTIONS,
  blanketNeoaiGrants,
  isOpenNeoaiAction,
  mayOperateNeoai,
  neoaiGateMiddleware,
} = await import(new URL('../src/server/lib/roleContext.ts', import.meta.url).href);

/** An ACL whose roles carry exactly the snippet verdicts given. `null` = "mentions neither". */
function fakeAcl(verdicts) {
  return {
    getRole(name) {
      if (!(name in verdicts)) return undefined;
      return { snippetAllowed: () => verdicts[name] };
    },
  };
}
const ctxFor = (roles, actionName) => ({
  state: { currentRoles: roles },
  action: { resourceName: 'neoai', actionName },
  throw(status, message) {
    const err = new Error(message);
    err.status = status;
    throw err;
  },
});

async function run(middleware, ctx) {
  let reached = false;
  try {
    await middleware(ctx, async () => { reached = true; });
    return { reached, status: null };
  } catch (err) {
    return { reached, status: err.status, message: err.message };
  }
}

// ── The open action ────────────────────────────────────────────────────────────────────────────

test('exactly ONE action is open, and it is the one that answers the access question', () => {
  assert.deepEqual([...NEOAI_OPEN_ACTIONS], ['access']);
  assert.equal(isOpenNeoaiAction('access'), true);
  for (const gated of ['ping', 'getSettings', 'secretsList', 'run', 'saveSettings', '*', '', null, undefined, 0]) {
    assert.equal(isOpenNeoaiAction(gated), false, `${String(gated)} must not be open`);
  }
});

test('the gate lets `access` through even for a role that holds nothing', () => {
  const acl = fakeAcl({ member: false });
  const gate = neoaiGateMiddleware(acl);
  return run(gate, ctxFor(['member'], 'access')).then((r) => {
    assert.equal(r.reached, true, 'a caller who may not use NeoAI must still be able to be TOLD so');
    assert.equal(r.status, null);
  });
});

// ── The gate as a layer ────────────────────────────────────────────────────────────────────────

test('a snippet holder passes, a rejecting role is refused, and "mentions neither" is refused too', async () => {
  const gate = neoaiGateMiddleware(fakeAcl({ ops: true, member: false, stranger: null }));

  assert.equal((await run(gate, ctxFor(['ops'], 'getSettings'))).reached, true);

  const refused = await run(gate, ctxFor(['member'], 'getSettings'));
  assert.equal(refused.reached, false);
  assert.equal(refused.status, 403);

  // `null` is the ACL's "this role mentions neither" and it must NOT pass. That is the difference
  // between asking the snippet and asking `can()`, which would also consult the blanket strategy.
  const unknown = await run(gate, ctxFor(['stranger'], 'getSettings'));
  assert.equal(unknown.reached, false);
  assert.equal(unknown.status, 403);
});

test('an action nobody has heard of is refused by DEFAULT — that is the whole point of the layer', async () => {
  // The failure mode this replaces: twenty-three handlers each opening with `requireAdmin(ctx)`.
  // That held by COUNTING. Action twenty-four, written on a Friday, would have been open.
  const gate = neoaiGateMiddleware(fakeAcl({ member: false }));
  const r = await run(gate, ctxFor(['member'], 'someActionInventedNextYear'));
  assert.equal(r.reached, false);
  assert.equal(r.status, 403);
});

test('the gate keeps its hands off every other resource', async () => {
  const gate = neoaiGateMiddleware(fakeAcl({ member: false }));
  const ctx = ctxFor(['member'], 'list');
  ctx.action.resourceName = 'crm_deals';
  assert.equal((await run(gate, ctx)).reached, true);
});

test('the gate reads the ACTIVE role, never the account membership', async () => {
  // Ticket 13c027fa's defect, re-pinned here because this middleware is a NEW reader of the same
  // state and would be the obvious place to reintroduce it.
  const gate = neoaiGateMiddleware(fakeAcl({ admin: true, member: false }));
  const ctx = ctxFor(['member'], 'getSettings');
  ctx.state.currentUser = { roles: [{ name: 'admin' }, { name: 'member' }] };
  const r = await run(gate, ctx);
  assert.equal(r.reached, false, 'holding admin on the account must not privilege a session acting as member');
  assert.equal(r.status, 403);
});

test('mayOperateNeoai asks about the console, not about whichever action is in flight', () => {
  let askedPath = null;
  const acl = { getRole: () => ({ snippetAllowed: (p) => { askedPath = p; return true; } }) };
  assert.equal(mayOperateNeoai(acl, ctxFor(['ops'], 'access')), true);
  assert.equal(askedPath, 'neoai:*',
    '"may I open the console" is not "may I call access" — asking the wrong path is how this drifts');
});

// ── The boot guard ─────────────────────────────────────────────────────────────────────────────

test('the boot guard finds the wildcard that used to stand here', () => {
  // `acl.allow('neoai','*','loggedIn')` sets permission.skip, which short-circuits can() entirely.
  const acl = { allowManager: { skipActions: new Map([['neoai', new Map([['*', 'loggedIn']])]]) } };
  assert.deepEqual(blanketNeoaiGrants(acl), ['neoai:*']);
});

test('the boot guard finds a gated action waved past the ACL', () => {
  const acl = {
    allowManager: {
      skipActions: new Map([['neoai', new Map([['access', 'loggedIn'], ['secretsList', 'loggedIn']])]]),
    },
  };
  assert.deepEqual(blanketNeoaiGrants(acl), ['neoai:secretsList']);
});

test('the boot guard does NOT trip over the framework\'s own `*:*` — measured, and it would brick boot', () => {
  // The first version of the guard treated the `'*'` resource as a finding too, because
  // `getAllowedConditions` really does consult `['*', resource]`. Correct reasoning, wrong guard:
  // `@nocobase/plugin-acl/dist/server/server.js:456` registers
  //     acl.allow("*", "*", (ctx) => ctx.state.currentRoles?.includes("root"))
  // on EVERY boot — that is how root short-circuits — and
  // `@nocobase/plugin-action-import` adds `*:downloadXlsxTemplate`. A guard that threw on those
  // would have taken the whole application down at every start. Verified by reading the shipped
  // files in the running container before this ever left the branch.
  //
  // A plugin may refuse to boot over its OWN surface being reopened. It may not refuse to boot
  // over the framework doing its job.
  const acl = {
    allowManager: {
      skipActions: new Map([
        ['neoai', new Map([['access', 'loggedIn']])],
        ['*', new Map([['*', () => false], ['downloadXlsxTemplate', 'loggedIn']])],
        ['users', new Map([['setDefaultRole', 'loggedIn']])],
      ]),
    },
  };
  assert.deepEqual(blanketNeoaiGrants(acl), [], 'this is a normal NocoBase boot and must be silent');
});

test('the boot guard is quiet about the grant that is meant to be there', () => {
  const acl = { allowManager: { skipActions: new Map([['neoai', new Map([['access', 'loggedIn']])]]) } };
  assert.deepEqual(blanketNeoaiGrants(acl), []);
  assert.deepEqual(blanketNeoaiGrants({}), [], 'no ACL is not a finding');
  assert.deepEqual(blanketNeoaiGrants(null), []);
});

// ── The wiring, in the file that cannot be imported ────────────────────────────────────────────

test('the blanket grant is gone and the narrow one took its place', () => {
  const plugin = stripComments(read('server/plugin.ts'));
  assert.doesNotMatch(plugin, /acl\.allow\('neoai',\s*'\*'/, 'the wildcard grant is what made the surface open');
  assert.match(plugin, /this\.app\.acl\.allow\('neoai', \[\.\.\.NEOAI_OPEN_ACTIONS\], 'loggedIn'\);/);
});

test('the plugin refuses to START if someone puts a blanket grant back', () => {
  const plugin = stripComments(read('server/plugin.ts'));
  assert.match(plugin, /const blanket = blanketNeoaiGrants\(this\.app\.acl\);/);
  assert.match(plugin, /if \(blanket\.length\) \{[\s\S]{0,400}throw new Error\(/,
    'a surface that quietly reopens is worse than a plugin that will not boot');
});

test('the gate middleware is registered after the ACL, never before it', () => {
  // A `before` middleware has no `ctx.state.currentRoles` at all, so it would refuse everyone —
  // the documented trap on this stack.
  const plugin = stripComments(read('server/plugin.ts'));
  assert.match(plugin, /resourceManager\.use\(neoaiGateMiddleware\(this\.app\.acl\), \{[\s\S]{0,120}after: 'acl',/);
});

test('every one of the gated actions still calls requireAdmin — layer three is not optional', () => {
  const plugin = stripComments(read('server/plugin.ts'));
  const actionNames = [...plugin.matchAll(/^\s{8}([a-zA-Z]+): async \(ctx: any, next: any\) => \{/gm)].map((m) => m[1]);
  assert.ok(actionNames.length >= 23, `expected at least 23 actions, saw ${actionNames.length}`);
  for (const name of actionNames) {
    const opener = `${name}: async (ctx: any, next: any) => {`;
    const at = plugin.indexOf(opener);
    // Bounded by the NEXT action, not by a fixed character count: `access` is four lines long, and
    // a 400-character window would have run straight into `ping`'s `requireAdmin` and passed.
    const rest = plugin.slice(at + opener.length);
    const nextAt = rest.search(/[a-zA-Z]+: async \(ctx: any, next: any\) => \{/);
    const head = nextAt === -1 ? rest : rest.slice(0, nextAt);
    if (NEOAI_OPEN_ACTIONS.includes(name)) {
      assert.doesNotMatch(head, /requireAdmin\(ctx\)/, `${name} is the OPEN action and must not gate itself`);
    } else {
      assert.match(head, /requireAdmin\(ctx\)/, `${name} lost its handler-level guard`);
    }
  }
});

// ── The client half: the refusal must be visible, and nothing may poll behind it ────────────────

test('the console shell is gated ONCE, not eight times inside the panels', () => {
  const console_ = read('client/console/NeoaiConsole.tsx');
  assert.match(console_, /export function NeoaiConsolePage\(\) \{[\s\S]{0,400}<ConsoleAccessGate/,
    'the gate must wrap the shell — if it sat inside, the panels would already have mounted');
  assert.match(console_, /function NeoaiConsoleBody\(\)/,
    'the body is a separate component precisely so it can be left unmounted');
  // The banner is the giveaway: it polls getSettings + spendToday every 60 s and lives in the body.
  assert.match(console_, /<SpendAlertBanner \/>/);
  const bodyAt = console_.indexOf('function NeoaiConsoleBody()');
  assert.ok(console_.indexOf('<SpendAlertBanner />') > bodyAt,
    'anything that polls must sit INSIDE the gated body');
});

test('the KNOWLEDGE console is gated the same way — found by clicking, not by reading', () => {
  // Bündel B. While verifying the NeoAI console's new refusal as `member`, the same walk was done
  // on the sibling Knowledge console and it did the OLD thing: the article table rendered
  // "No articles yet" — the EMPTY state, not a refusal — with two repeating
  // "Load failed: Request failed with status code 403" toasts beside it and a "New article" button
  // the caller may not use. Ticket 7466a838 named "the eight areas of the NeoAI console"; this is a
  // sibling with its own route tree, and that is exactly why the ticket list missed it.
  const knowledge = read('client/console/KnowledgeConsole.tsx');
  assert.match(knowledge, /export function KnowledgeConsolePage\(\) \{[\s\S]{0,400}<ConsoleAccessGate/);
  assert.match(knowledge, /function KnowledgeConsoleBody\(\)/,
    'the body must be its own component so it can be left unmounted');
  const bodyAt = knowledge.indexOf('function KnowledgeConsoleBody()');
  const pageAt = knowledge.indexOf('export function KnowledgeConsolePage()');
  assert.ok(pageAt > bodyAt, 'the gate wraps the body, not the other way round');
});

test('a refusal is a named state — not a spinner, not an empty list', () => {
  const shared = read('client/console/shared.tsx');
  assert.match(shared, /export function NoAccessPanel/);
  assert.match(shared, /You do not have access to this area/);
  assert.match(shared, /pm\.neoai\.settings/, 'say WHICH permission is missing, or the sentence is useless');
  assert.match(shared, /nothing to retry/i, 'a refusal does not expire — do not send the operator back to a button');
});

test('"cannot answer" is a third state, and it does NOT lock the console', () => {
  // Deployment skew: a newer bundle meeting an older server must not lock everyone out. Only an
  // explicit `false` closes the door.
  const shared = read('client/console/shared.tsx');
  assert.match(shared, /data\?\.console === true \? 'granted' : data\?\.console === false \? 'denied' : 'unknown'/);
  assert.match(shared, /if \(access === 'denied'\) return <NoAccessPanel/);
  const gate = shared.slice(shared.indexOf('export function ConsoleAccessGate'));
  assert.doesNotMatch(gate, /'unknown'/, "unknown falls through to the children — it must not be branched on here");
});
