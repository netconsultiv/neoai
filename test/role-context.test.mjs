// Ticket 13c027fa — NeoAI's admin gate: the ACTIVE role, asked of the ACL.
//
// Two defects are pinned here. Both shipped in `src/server/lib/env.ts` and both were invisible to
// the test suite because nothing exercised the gate at all:
//
//   1. `ctx.state.currentUser.roles` was read as a "fallback for some auth paths". It is not a
//      fallback: `@nocobase/plugin-acl`'s setCurrentRole.js:75 writes the account's FULL
//      membership list there on every authenticated request. Switching to a non-admin role
//      therefore changed nothing — measured on :13000, one account, one token: `X-Role: member`
//      still got 200 on `neoai:secretsList`.
//   2. `ADMIN_ROLES = new Set(['root','admin'])` decided in code a policy the deployment had
//      already expressed through the snippet `pm.neoai.settings`.
//
// The ACL doubles below are not mocks of convenience: `snippetAllowed()` really does return
// true / false / null (see @nocobase/acl/lib/acl-role.js:136-157) and `null` — a role that neither
// grants nor rejects the snippet — is the case that must NOT pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminCtx, neoaiActionPath, rolesOfContext, NEOAI_ADMIN_SNIPPET } from '../src/server/lib/roleContext.ts';

// The roles on the sandbox stack, with the snippet verdict each one really produces for
// `neoai:*` (read out of the live role table on 2026-07-31).
//   admin  snippets ["pm","pm.*","ui.*"]                            -> pm.neoai.settings ALLOWED
//   root   short-circuited by the framework before snippets matter
//   architect / member / sales / …  ["!pm","!pm.*","!ui.*"]          -> REJECTED
//   pdf_operator ["!ui.*","!pm","pm.pdf-generator.settings"]         -> neither: NULL
const VERDICTS = {
  admin: true,
  root: null,          // deliberately null: the root row need not carry snippets
  architect: false,
  member: false,
  sales: false,
  pdf_operator: null,  // privileged in ANOTHER plugin — must not be privileged here
};

const acl = {
  getRole: (name) => (name in VERDICTS ? { snippetAllowed: () => VERDICTS[name] } : undefined),
};

/** Exactly what setCurrentRole leaves behind for a multi-role account in roleMode `default`. */
const MEMBERSHIP = [
  { name: 'member' }, { name: 'root' }, { name: 'admin' },
  { name: 'pdf_operator' }, { name: 'architect' },
];
const switchedTo = (role) => ({
  action: { resourceName: 'neoai', actionName: 'secretsList' },
  state: {
    currentRole: role,
    currentRoles: [role],
    // setCurrentRole:75 writes this on EVERY authenticated request. Present, privileged, ignored.
    currentUser: { id: 1, roles: MEMBERSHIP },
  },
});

// ── DEFECT 1: THE ACTIVE ROLE ────────────────────────────────────────────────────────────────────

test('switching to a non-admin role really drops admin — the account membership is not consulted', () => {
  // The measured defect. Before the fix all three of these were `true`, because the membership
  // list on the user carried `admin`.
  for (const role of ['member', 'architect']) {
    assert.equal(isAdminCtx(acl, switchedTo(role)), false, `X-Role ${role} must not be admin`);
  }
  // The sharpest form: nothing on the context but the membership list.
  assert.equal(
    isAdminCtx(acl, { action: { actionName: 'secretsList' }, state: { currentUser: { id: 1, roles: MEMBERSHIP } } }),
    false,
    'who the caller IS is not who they are ACTING AS',
  );
});

test('the counter-proof: admin and root still get in', () => {
  // A gate that refuses everybody would satisfy the test above and break the console.
  assert.equal(isAdminCtx(acl, switchedTo('admin')), true);
  assert.equal(isAdminCtx(acl, switchedTo('root')), true, 'root is short-circuited as the framework does it');
});

test('rolesOfContext mirrors acl.js:302 and never returns the pseudo-role', () => {
  assert.deepEqual(rolesOfContext(switchedTo('member')).slice(), ['member']);
  // Union mode: NocoBase fills currentRoles with every role ON PURPOSE. Not a bug, not to be fixed.
  assert.deepEqual(
    rolesOfContext({ state: { currentRole: '__union__', currentRoles: ['member', 'admin'] } }),
    ['member', 'admin'],
  );
  assert.deepEqual(rolesOfContext({ state: { currentRole: '__union__' } }), []);
  // The singular is the fallback only where setCurrentRole leaves no plural (X-Role: anonymous).
  assert.deepEqual(rolesOfContext({ state: { currentRole: 'anonymous' } }), ['anonymous']);
  assert.deepEqual(rolesOfContext({ state: { currentRole: 'member', currentRoles: ['admin'] } }), ['admin']);
  assert.deepEqual(rolesOfContext({ state: { currentRoles: [{ name: 'admin' }] } }), ['admin']);
});

test('union mode is still gated — carrying non-admin roles alongside is not a way in', () => {
  const union = (names) => ({
    action: { actionName: 'secretsList' },
    state: { currentRole: '__union__', currentRoles: names, currentUser: { id: 1, roles: MEMBERSHIP } },
  });
  assert.equal(isAdminCtx(acl, union(['member', 'architect'])), false);
  assert.equal(isAdminCtx(acl, union(['member', 'admin'])), true, 'the union genuinely contains admin');
});

// ── DEFECT 2: THE ACL DECIDES, NOT A LIST IN THE CODE ────────────────────────────────────────────

test('a role that neither grants nor rejects the snippet does NOT pass', () => {
  // snippetAllowed() returns null there. Treating null as "probably fine" is how a gate becomes a
  // lock painted on a door. pdf_operator is the real example: privileged in pdf-generator,
  // mentioned nowhere by NeoAI's snippet, and it must be refused here.
  assert.equal(isAdminCtx(acl, switchedTo('pdf_operator')), false);
});

test('the gate asks the ACL — a role it grants is admin whatever the role is called', () => {
  // The replacement for the hardcoded {root, admin}: rename the operating role, grant it the
  // snippet, and the gate follows the deployment instead of the source file.
  const grantsOps = { getRole: () => ({ snippetAllowed: () => true }) };
  assert.equal(isAdminCtx(grantsOps, switchedTo('neoai_operator')), true);
  // …and the converse: a role literally called "admin" that the ACL does NOT grant is refused.
  const grantsNobody = { getRole: () => ({ snippetAllowed: () => false }) };
  assert.equal(isAdminCtx(grantsNobody, switchedTo('admin')), false, 'no role name is a magic word');
});

test('the snippet name is the one the plugin registers', () => {
  // Two copies of one door: `acl.registerSnippet` in plugin.ts and this constant, which the gate
  // asks about. They must move together. (Unlike pdf-generator there is no third copy on the
  // client: NeoAI's console is registered as nested admin routes, not through
  // pluginSettingsManager, so it carries no `aclSnippet` — the console UI is reachable by any
  // logged-in user and every action inside it answers 403. That is a separate, pre-existing gap,
  // the same shape as pdf-generator ticket 202fa260, and this ticket does not close it.)
  assert.equal(NEOAI_ADMIN_SNIPPET, 'pm.neoai.settings');
});

test('the question asked is about the action actually being invoked', () => {
  assert.equal(neoaiActionPath({ action: { actionName: 'secretsList' } }), 'neoai:secretsList');
  assert.equal(neoaiActionPath({ action: { actionName: '  run  ' } }), 'neoai:run');
  // Outside an action context the snippet's own wildcard is used — still the snippet's answer,
  // not a guess.
  assert.equal(neoaiActionPath({}), 'neoai:*');
  assert.equal(neoaiActionPath(undefined), 'neoai:*');
});

// ── FAIL CLOSED ──────────────────────────────────────────────────────────────────────────────────

test('every uncertainty resolves to "not an admin"', () => {
  // NeoAI's actions read provider credentials, spend money and run workflows. An unresolvable
  // caller is not an admin.
  assert.equal(isAdminCtx(acl, undefined), false);
  assert.equal(isAdminCtx(acl, {}), false);
  assert.equal(isAdminCtx(acl, { state: {} }), false);
  assert.equal(isAdminCtx(acl, switchedTo('a_role_the_acl_never_heard_of')), false);
  // No ACL at all — an early middleware, a half-booted app.
  assert.equal(isAdminCtx(undefined, switchedTo('admin')), false);
  assert.equal(isAdminCtx({}, switchedTo('admin')), false);
  // An ACL that throws must not be read as consent.
  assert.equal(isAdminCtx({ getRole: () => { throw new Error('boom'); } }, switchedTo('admin')), false);
  assert.equal(
    isAdminCtx({ getRole: () => ({ snippetAllowed: () => { throw new Error('boom'); } }) }, switchedTo('admin')),
    false,
  );
});

test('the raw X-Role header is not a role source', () => {
  // It is client input; only setCurrentRole's verdict on ctx.state may be read.
  assert.equal(
    isAdminCtx(acl, { action: { actionName: 'secretsList' }, state: {}, headers: { 'x-role': 'admin' }, get: () => 'admin' }),
    false,
  );
});
