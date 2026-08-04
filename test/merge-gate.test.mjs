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
// So every assertion below is about an EXIT CODE, not about wording. Each feeds
// `merge-gate.mjs` a synthetic `npm test` log through `--no-run` and checks
// which way it falls. `--no-run` exists for exactly this: the gate can be judged
// without paying for a real `npm test` inside a test.
//
// The mutation probe of the finish criterion — "empty node_modules must turn the
// gate red" — is the `toolchain NOT installed` case below, which is the literal
// line an un-installed tree produces. (It was also run for real, against a
// genuinely emptied node_modules, before this file was written.)
//
// This file is IDENTICAL in all @neomodul plugin repos: it derives the stage
// names from this repo's own `scripts.test` instead of naming them, exactly as
// the script under test does. A copy that had to be edited per repo would drift,
// which is the failure mode `scripts/check-build.mjs` rule 1 is about.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, '..');
const GATE = join(REPO_ROOT, 'scripts', 'merge-gate.mjs');

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

/** The stages this repo's `npm test` actually chains — derived, never listed. */
function deriveStages(scriptName, scripts, seen = new Set()) {
  if (seen.has(scriptName)) return [];
  seen.add(scriptName);
  const body = scripts?.[scriptName];
  if (typeof body !== 'string') return [];
  const out = [...body.matchAll(/node\s+scripts\/([A-Za-z0-9._-]+)\.mjs/g)].map((m) => m[1]);
  for (const m of body.matchAll(/npm\s+run\s+([A-Za-z0-9:._-]+)/g)) out.push(...deriveStages(m[1], scripts, seen));
  return out;
}
const STAGES = [...new Set(deriveStages('test', pkg.scripts))].filter((s) => s !== 'merge-gate');
const CEILING = pkg.neobaseMergeGate?.maxSkippedPercent;

/** Run the gate over a synthetic log. Never runs `npm test`. */
function gate(log, { env: extraEnv = {} } = {}) {
  const env = { ...process.env, ...extraEnv };
  if (!('NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT' in extraEnv)) {
    delete env.NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT; // the repo's own declaration must decide here
  }
  const r = spawnSync(process.execPath, [GATE, '--no-run', '--allow-dirty'], {
    cwd: REPO_ROOT, input: log, encoding: 'utf8', env,
  });
  return { code: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
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
  assert.ok(existsSync(GATE), 'scripts/merge-gate.mjs must exist');
  assert.equal(pkg.scripts?.['merge-gate'], 'node scripts/merge-gate.mjs',
    'package.json must expose `npm run merge-gate`');
  // It RUNS `npm test`, so chaining it INTO `npm test` would recurse forever.
  assert.ok(!/merge-gate/.test(pkg.scripts?.test ?? ''),
    '`scripts.test` must NOT chain merge-gate — it would recurse');
  assert.ok(STAGES.length > 0, '`scripts.test` must chain at least one scripts/*.mjs stage');
});

test('the skip ceiling is a SETTING in package.json, not a constant in the script', () => {
  assert.equal(typeof CEILING, 'number', 'package.json must declare neobaseMergeGate.maxSkippedPercent');
  assert.ok(CEILING >= 0 && CEILING <= 100, 'the ceiling must be a percentage');
  const src = readFileSync(GATE, 'utf8');
  assert.ok(/NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT/.test(src), 'env override must exist');
  assert.ok(/neobaseMergeGate\?\.maxSkippedPercent/.test(src), 'package.json setting must be read');
});

test('NEGATIVE CONTROL: a fully measured run is ALLOWED', () => {
  const { code, out } = gate(healthyLog());
  assert.equal(code, 0, out);
  assert.match(out, /MERGE ALLOWED/);
});

test('MUTATION PROBE: `toolchain NOT installed` — an un-installed tree — is REFUSED', () => {
  const log = [
    ...STAGES.filter((s) => s !== 'run-unit-tests').map((s) => `${s}: NOT MEASURED — node_modules is empty or absent.`),
    'run-unit-tests: 41 file(s) · 845 test(s) · 109 measured · 736 skipped (87%) · toolchain NOT installed',
  ].join('\n');
  const { code, out } = gate(log);
  assert.equal(code, 1, out);
  assert.match(out, /MERGE REFUSED/);
  assert.match(out, /toolchain is NOT installed/);
  assert.match(out, /SKIP SHARE 87%/);
});

test('ONE stage saying `NOT MEASURED` is enough to refuse, however green the rest is', () => {
  for (const stage of STAGES.filter((s) => s !== 'run-unit-tests')) {
    const { code, out } = gate(healthyLog({ blind: [stage] }));
    assert.equal(code, 1, out);
    assert.match(out, new RegExp(`stage \`${stage}\` did NOT measure`));
  }
});

test('a stage that printed NOTHING is UNVERIFIED, and unverified is a refusal', () => {
  for (const stage of STAGES) {
    const { code, out } = gate(healthyLog({ omit: [stage] }));
    assert.equal(code, 1, out);
    assert.match(out, new RegExp(`\`${stage}\``));
  }
});

test('a skip share over the declared ceiling is REFUSED; at the ceiling it passes', () => {
  const over = gate(healthyLog({ skipped: 90, pct: CEILING + 1 }));
  assert.equal(over.code, 1, over.out);
  assert.match(over.out, /SKIP SHARE/);

  const at = gate(healthyLog({ skipped: 2, pct: CEILING }));
  assert.equal(at.code, 0, at.out);
});

test('the env override wins over the repo declaration', () => {
  const raised = gate(healthyLog({ skipped: 90, pct: CEILING + 5 }), {
    env: { NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT: String(CEILING + 5) },
  });
  assert.equal(raised.code, 0, raised.out);
  assert.match(raised.out, /env NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT/);
});

test('a broken ceiling falls back to the SAFE default, never to "anything goes"', () => {
  const { code, out } = gate(healthyLog({ skipped: 90, pct: 11 }), {
    env: { NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT: 'sehr viel' },
  });
  assert.equal(code, 1, out);
  assert.match(out, /INVALID, default used/);
});

test('the stages are DERIVED from scripts.test, and every one of them is named in the verdict', () => {
  const src = readFileSync(GATE, 'utf8');
  assert.ok(/scripts\.test/.test(src) && /deriveStages/.test(src),
    'a hand-kept stage list is what drifts — it must be derived');
  const { out } = gate(healthyLog());
  for (const stage of STAGES) assert.match(out, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});
