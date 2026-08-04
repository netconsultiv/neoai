// test/merge-gate.test.mjs
// -----------------------------------------------------------------------------
// Guards `scripts/merge-gate.mjs` — the command that answers "may this PR be
// merged?" — against the exact defect it was built to stop.
//
// On 2026-08-04 22:35 UTC three PRs (neoai #20, design-studio #49,
// pdf-generator #28) were merged on a gate that had printed, verbatim:
//
//     41 file(s) · 845 test(s) · 109 measured · 736 skipped (87%)
//     toolchain NOT installed
//     check-types: TYPE CHECK NOT MEASURED — node_modules is empty or absent
//     check-build: NOT MEASURED — 2 build step(s) derived and present, 0 EXECUTED
//
// `npm test` exited 0 over all of it, ON PURPOSE — the house norm (Ben,
// 2026-08-01) is that a red `npm test` must always mean a real defect, never a
// missing installation. The shortfall was printed in words, including the
// sentence "Do not quote this run as evidence". The run quoted it and merged.
//
//   > A sentence cannot stop a merge. Only an exit code can.
//
// WHAT THIS FILE ASSERTS OVER, AND WHY IT SPAWNS NOTHING. The decision half of
// the gate lives in `scripts/lib/merge-gate-verdict.mjs` as pure functions, so
// every case below is a plain function call over a synthetic `npm test` log. A
// gate whose own test had to shell out would be red whenever the box is busy,
// and "red" would stop meaning anything — which is the very failure family this
// gate exists to close. (crm's `test/tests-are-offline.test.mjs` enforces that
// as a rule; it caught the first draft of this file and was right to.)
//
// The mutation probe of the finish criterion — "empty node_modules must turn the
// gate red" — is the `toolchain NOT installed` case below, which is the literal
// line an un-installed tree produces. It was ALSO run for real, against a
// genuinely emptied node_modules, before this file was written: `npm test`
// exited 0, `npm run merge-gate` exited 1.
//
// This file is IDENTICAL in all @neomodul plugin repos: it derives the stage
// names from this repo's own `scripts.test` instead of naming them, exactly as
// the code under test does. A copy that had to be edited per repo would drift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judge, testStages, readThreshold, deriveStages, DEFAULT_MAX_SKIPPED_PCT } from '../scripts/lib/merge-gate-verdict.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, '..');
const CLI = join(REPO_ROOT, 'scripts', 'merge-gate.mjs');

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
const STAGES = testStages(pkg);
const CEILING = pkg.neobaseMergeGate?.maxSkippedPercent;

/** Judge a synthetic log against THIS repo's real package.json. */
function gate(log, env = {}) {
  return judge({ pkg, log, testExit: 0, env, dirty: false, allowDirty: false, isRepo: true });
}

/** A log in which every stage of THIS repo's `scripts.test` measured something. */
function healthyLog({ skipped = 0, pct = 0, omit = [], blind = [] } = {}) {
  const tests = 845;
  return STAGES.filter((s) => !omit.includes(s)).map((s) => {
    if (blind.includes(s)) return `${s}: NOT MEASURED — nothing was executed.`;
    if (s === 'run-unit-tests') {
      return `run-unit-tests: 41 file(s) · ${tests} test(s) · ${tests - skipped} measured · ${skipped} skipped (${pct}%) · toolchain installed`;
    }
    return `${s}: OK — 12 thing(s) checked, 0 problem(s).`;
  }).join('\n');
}

test('the gate exists, is its own npm script, and is NOT chained into `npm test`', () => {
  assert.ok(existsSync(CLI), 'scripts/merge-gate.mjs must exist');
  assert.ok(existsSync(join(REPO_ROOT, 'scripts', 'lib', 'merge-gate-verdict.mjs')),
    'the decision half must live in scripts/lib/merge-gate-verdict.mjs');
  assert.equal(pkg.scripts?.['merge-gate'], 'node scripts/merge-gate.mjs',
    'package.json must expose `npm run merge-gate`');
  // It RUNS `npm test`, so chaining it INTO `npm test` would recurse forever.
  assert.ok(!/merge-gate/.test(pkg.scripts?.test ?? ''),
    '`scripts.test` must NOT chain merge-gate — it would recurse');
  assert.ok(STAGES.length > 0, '`scripts.test` must chain at least one scripts/*.mjs stage');
});

test('a REFUSAL reaches the shell as a non-zero exit — a sentence cannot stop a merge', () => {
  const cli = readFileSync(CLI, 'utf8');
  assert.match(cli, /if \(!verdict\.allowed\) process\.exit\(1\);/,
    'the CLI must map "not allowed" onto a non-zero exit code');
  // ... and it must do so BEFORE it can reach the `gh pr merge` half.
  assert.ok(
    cli.indexOf('if (!verdict.allowed) process.exit(1);') < cli.indexOf("'pr', 'merge'"),
    'the refusal must be evaluated before anything can merge',
  );
});

test('the skip ceiling is a SETTING, not a constant, and env beats the repo declaration', () => {
  assert.equal(typeof CEILING, 'number', 'package.json must declare neobaseMergeGate.maxSkippedPercent');
  assert.ok(CEILING >= 0 && CEILING <= 100, 'the ceiling must be a percentage');

  assert.deepEqual(readThreshold({}, pkg), {
    pct: CEILING, source: 'package.json neobaseMergeGate.maxSkippedPercent',
  });
  assert.equal(readThreshold({ NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT: '7' }, pkg).pct, 7);
  // An env var exported EMPTY is absent, not 0 — it must not silently override the repo.
  assert.equal(readThreshold({ NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT: '' }, pkg).pct, CEILING);
  // No declaration anywhere -> the safe default.
  assert.equal(readThreshold({}, {}).pct, DEFAULT_MAX_SKIPPED_PCT);
});

test('a broken ceiling falls back to the SAFE default, never to "anything goes"', () => {
  for (const bad of ['sehr viel', '-1', '101', 'NaN', {}]) {
    const t = readThreshold({}, { neobaseMergeGate: { maxSkippedPercent: bad } });
    assert.equal(t.pct, DEFAULT_MAX_SKIPPED_PCT, `${JSON.stringify(bad)} must fall back`);
    assert.match(t.source, /INVALID, default used/);
  }
});

test('NEGATIVE CONTROL: a fully measured run is ALLOWED', () => {
  const v = gate(healthyLog());
  assert.equal(v.allowed, true, v.refusals.join('\n'));
  assert.deepEqual(v.refusals, []);
});

test('MUTATION PROBE: `toolchain NOT installed` — an un-installed tree — is REFUSED', () => {
  const log = [
    ...STAGES.filter((s) => s !== 'run-unit-tests').map((s) => `${s}: NOT MEASURED — node_modules is empty or absent.`),
    'run-unit-tests: 41 file(s) · 845 test(s) · 109 measured · 736 skipped (87%) · toolchain NOT installed',
  ].join('\n');
  const v = gate(log);
  assert.equal(v.allowed, false);
  const why = v.refusals.join('\n');
  assert.match(why, /toolchain is NOT installed/);
  assert.match(why, /SKIP SHARE 87%/);
});

test('ONE stage saying `NOT MEASURED` is enough to refuse, however green the rest is', () => {
  for (const stage of STAGES.filter((s) => s !== 'run-unit-tests')) {
    const v = gate(healthyLog({ blind: [stage] }));
    assert.equal(v.allowed, false, `${stage} must be able to refuse alone`);
    assert.match(v.refusals.join('\n'), new RegExp(`stage \`${stage}\` did NOT measure`));
  }
});

test('a stage that printed NOTHING is UNVERIFIED, and unverified is a refusal', () => {
  for (const stage of STAGES) {
    const v = gate(healthyLog({ omit: [stage] }));
    assert.equal(v.allowed, false, `${stage} must not pass silently`);
    assert.match(v.refusals.join('\n'), new RegExp(`\`${stage}\``));
  }
});

test('a skip share over the declared ceiling is REFUSED; at the ceiling it passes', () => {
  const over = gate(healthyLog({ skipped: 90, pct: CEILING + 1 }));
  assert.equal(over.allowed, false);
  assert.match(over.refusals.join('\n'), /SKIP SHARE/);

  const at = gate(healthyLog({ skipped: 2, pct: CEILING }));
  assert.equal(at.allowed, true, at.refusals.join('\n'));
});

test('a suite that measured NOTHING is refused even at a 100% ceiling', () => {
  const v = judge({
    pkg, testExit: 0, env: { NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT: '100' },
    log: healthyLog().replace(/^run-unit-tests:.*$/m,
      'run-unit-tests: 41 file(s) · 845 test(s) · 0 measured · 845 skipped (100%) · toolchain installed'),
  });
  assert.equal(v.allowed, false);
  assert.match(v.refusals.join('\n'), /NOTHING MEASURED/);
});

test('a non-zero `npm test`, a dirty tree and a non-repo are each refusals', () => {
  assert.equal(judge({ pkg, log: healthyLog(), testExit: 1 }).allowed, false);
  assert.equal(judge({ pkg, log: healthyLog(), testExit: 0, dirty: true }).allowed, false);
  assert.equal(judge({ pkg, log: healthyLog(), testExit: 0, isRepo: false }).allowed, false);
  // --allow-dirty downgrades the dirty tree to a NOTE, and says so in the verdict.
  const v = judge({ pkg, log: healthyLog(), testExit: 0, dirty: true, allowDirty: true });
  assert.equal(v.allowed, true, v.refusals.join('\n'));
  assert.match(v.notes.join('\n'), /allow-dirty/);
});

test('an empty stage selection is a refusal, never a green "nothing to do"', () => {
  assert.equal(judge({ pkg: { scripts: { test: 'echo hi' } }, log: '', testExit: 0 }).allowed, false);
  assert.equal(judge({ pkg: { scripts: {} }, log: '', testExit: 0 }).allowed, false);
});

test('the stages are DERIVED from scripts.test, including through `npm run <x>`', () => {
  assert.deepEqual(
    deriveStages('test', { test: 'node scripts/a.mjs && npm run tc', tc: 'node scripts/b.mjs' }),
    ['a', 'b'],
  );
  // A self-referential chain must terminate rather than hang the gate.
  assert.deepEqual(deriveStages('test', { test: 'npm run test' }), []);
  // And this repo's real chain must be fully covered by the verdict.
  const v = gate(healthyLog());
  assert.deepEqual(v.stages, STAGES);
  assert.deepEqual(v.stageReport.map((s) => s.stage), STAGES);
});
