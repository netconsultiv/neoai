#!/usr/bin/env node
/**
 * merge-gate — the ONE command that is allowed to answer "may this PR be merged?".
 *
 * ---- WHY THIS EXISTS (measured 2026-08-04/05, ticket "3 Plugin-PRs auf einem BLINDEN Tor") ------
 *
 * On 2026-08-04 22:35 UTC a run merged three PRs — neoai #20, design-studio #49,
 * pdf-generator #28 — and then ran the pin cascade, so the code went to `develop` and into the
 * next image. The gate it merged on had, verbatim:
 *
 *     design-studio : 41 file(s) · 845 test(s) · 109 measured · 736 skipped (87%)
 *                     toolchain NOT installed
 *                     check-types: TYPE CHECK NOT MEASURED — node_modules is empty or absent
 *     neoai         : check-build: NOT MEASURED — 2 build step(s) derived and present, 0 EXECUTED
 *     pdf-generator : check-build: NOT MEASURED — 2 build step(s) derived and present, 0 EXECUTED
 *
 * 87 % of one suite never ran, and in two repos not one build step was executed. `npm test`
 * nevertheless exited 0 — ON PURPOSE. The house norm (Ben, 2026-08-01) is:
 *
 *   > a red `npm test` must ALWAYS mean a real defect, never merely a missing installation.
 *
 * So `scripts/run-unit-tests.mjs`, `scripts/check-build.mjs` and `scripts/check-types.mjs` all
 * excuse themselves on a tree without a toolchain: they print the shortfall, loudly, in words
 * ("Do not quote this run as evidence"), and hand back a green exit code.
 *
 * **The words were printed. The run merged anyway.** That is the whole lesson of this file:
 *
 *   > A sentence cannot stop a merge. Only an exit code can.
 *
 * ---- WHY IT IS A SEPARATE COMMAND AND NOT ANOTHER STAGE OF `npm test` --------------------------
 *
 * The two questions are genuinely different and must keep their own exit codes:
 *
 *   `npm test`            "does this repo have a DEFECT?"      A missing toolchain is not one.
 *                                                              Stays green. House norm intact.
 *   `npm run merge-gate`  "did this run MEASURE enough to be   A missing toolchain means it did
 *                          quoted as a gate?"                  not. RED, always.
 *
 * Making `npm test` red on a bare checkout would break the norm in exactly the direction that
 * trains people to ignore red ([[waechter-brauchen-einen-zwangspunkt]] rule 2). Making the merge
 * gate green on an unmeasured run is what produced the incident above. Two commands, two answers.
 *
 * ---- IT MEASURES, IT DOES NOT TRUST A FILE -----------------------------------------------------
 *
 * This script RUNS `npm test` itself and reads the accounting off the run it just watched. It
 * deliberately does NOT read a verdict file left behind by an earlier run: a stale, forged or
 * simply older-than-HEAD record is the same green lie one indirection further out. The tree it
 * judges is the tree it measured, and it prints the HEAD it measured next to the verdict.
 *
 * ---- HOW IT DECIDES ----------------------------------------------------------------------------
 *
 *  1. The expected STAGES ARE DERIVED from `package.json` → `scripts.test`, never kept by hand.
 *     `npm run <x>` inside that string is resolved recursively. A hand-kept list has drifted from
 *     the thing it described three times in this repo family (see DIST_SHIPPING_PLUGINS in
 *     sandbox.sh, and rule 1 of scripts/check-build.mjs).
 *  2. Zero derived stages, or no `test` script at all, is a REFUSAL — never a green "nothing to do"
 *     ([[waechter-brauchen-einen-zwangspunkt]]: a gate over an empty selection is the house's
 *     oldest recurring defect).
 *  3. Every derived stage must have PRINTED ITS OWN ACCOUNTING — at least one line starting with
 *     `<stage>: `. A stage that ran and said nothing about what it checked cannot be verified, and
 *     "cannot be verified" is a refusal here, not a pass. This is generic on purpose: a new stage
 *     added to `npm test` without an accounting line turns the gate red loudly, instead of
 *     widening a blind spot silently.
 *  4. Any accounting line carrying `NOT MEASURED`, `NOT installed` or `TYPE CHECK NOT MEASURED`
 *     is a REFUSAL, whatever the exit code was.
 *  5. `run-unit-tests`' accounting line is parsed for real: `measured` must be > 0 and the SKIP
 *     SHARE must be at or under the configured ceiling.
 *  6. A non-zero `npm test` is a refusal, obviously.
 *  7. The working tree must be clean, so the verdict names a commit that actually exists and can
 *     be pushed. `--allow-dirty` exists for local experiments and is printed in the verdict.
 *
 * ---- THE THRESHOLD IS A SETTING, NOT A CONSTANT ------------------------------------------------
 *
 * [[einstellbar-statt-hartkodiert]]. Precedence, the house pattern `env || settings || DEFAULT`:
 *
 *     NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT      env, for a one-off
 *     package.json → neobaseMergeGate.maxSkippedPercent      the repo's declaration
 *     0                                        default — and a broken value (empty, negative,
 *                                              non-numeric, > 100) falls back to this default,
 *                                              never to "anything goes"
 *
 * It sits in `package.json` next to `--max-skipped`, the sibling ceiling it complements, where
 * raising it is a visible, reviewable line in the diff of the PR that raises it.
 *
 * ---- THE FORCING POINT -------------------------------------------------------------------------
 *
 * `gh pr merge` on a DRAFT pull request is refused by GitHub itself — server-side, on this plan,
 * with no branch protection (which these private repos cannot have: the API answers 403 "Upgrade
 * to GitHub Pro"). So the procedure is:
 *
 *     gh pr create --draft --base develop ...      # every PR is born un-mergeable
 *     npm run merge-gate -- --merge <n>            # measures, then flips ready + merges
 *
 * `--merge` is the short path: it gates, and only on ALLOW does it run `gh pr ready` and
 * `gh pr merge`. A run that instead types `gh pr merge` by hand on a draft is stopped by GitHub;
 * to get past that it has to type `gh pr ready` explicitly, which is a deliberate, greppable act
 * rather than an oversight.
 *
 * Usage:
 *   node scripts/merge-gate.mjs                 # measure + verdict, exit 1 unless MERGE ALLOWED
 *   node scripts/merge-gate.mjs --merge 49      # ... and on ALLOW: gh pr ready + gh pr merge
 *   node scripts/merge-gate.mjs --allow-dirty   # skip the clean-tree requirement (says so aloud)
 *   node scripts/merge-gate.mjs --no-run        # judge a `npm test` log on stdin instead
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MAX_SKIPPED_PCT = 0;

// ---- arguments ---------------------------------------------------------------------------------
const argv = process.argv.slice(2);
let prNumber = null;
let allowDirty = false;
let noRun = false;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === '--merge') {
    prNumber = argv[++i];
    if (!/^\d+$/.test(prNumber ?? '')) {
      console.error(`merge-gate: --merge needs a PR number, got ${JSON.stringify(prNumber)}.`);
      process.exit(2);
    }
  } else if (arg === '--allow-dirty') allowDirty = true;
  else if (arg === '--no-run') noRun = true;
  else {
    console.error(`merge-gate: unknown argument ${JSON.stringify(arg)}.`);
    process.exit(2);
  }
}

// ---- the repo, its stages, its threshold -------------------------------------------------------
let pkg;
try {
  pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'));
} catch (error) {
  console.error(`merge-gate: cannot read package.json — ${error.message}`);
  process.exit(1);
}

const NAME = pkg.name ?? '(unnamed package)';

/**
 * Derive the stage names from a `scripts.*` string. A stage is anything invoked as
 * `node scripts/<name>.mjs`; `npm run <x>` is resolved through `scripts.<x>` recursively, because
 * konfigurator chains `npm run typecheck` inside its `test`.
 */
function deriveStages(scriptName, scripts, seen = new Set()) {
  if (seen.has(scriptName)) return [];
  seen.add(scriptName);
  const body = scripts?.[scriptName];
  if (typeof body !== 'string') return [];
  const stages = [];
  for (const m of body.matchAll(/node\s+scripts\/([A-Za-z0-9._-]+)\.mjs/g)) stages.push(m[1]);
  for (const m of body.matchAll(/npm\s+run\s+([A-Za-z0-9:._-]+)/g)) {
    stages.push(...deriveStages(m[1], scripts, seen));
  }
  return stages;
}

const stages = [...new Set(deriveStages('test', pkg.scripts))].filter((s) => s !== 'merge-gate');

const refusals = [];
const notes = [];

if (typeof pkg.scripts?.test !== 'string') {
  refusals.push('this repo declares no `test` script — there is nothing to gate on.');
} else if (stages.length === 0) {
  refusals.push(
    `\`scripts.test\` derives NO stage: ${JSON.stringify(pkg.scripts.test)}\n` +
    '      A gate over an empty selection is not a pass, it is an unmeasured run.',
  );
}

// Threshold: env || package.json || default. A broken value falls back to the DEFAULT, never to
// a permissive one — [[einstellbar-statt-hartkodiert]]: "auch ein kaputter Wert muss den sicheren
// Zustand ergeben".
function readThreshold() {
  // An env var set to the empty string is ABSENT, not "0" — otherwise exporting it empty would
  // silently override the repo's own declaration.
  const fromEnv = process.env.NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT || undefined;
  const fromPkg = pkg.neobaseMergeGate?.maxSkippedPercent;
  const raw = fromEnv ?? fromPkg;
  const source = fromEnv != null
    ? 'env NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT'
    : fromPkg != null
      ? 'package.json neobaseMergeGate.maxSkippedPercent'
      : 'default';
  if (raw == null || raw === '') return { pct: DEFAULT_MAX_SKIPPED_PCT, source: 'default' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    notes.push(`the configured skip ceiling ${JSON.stringify(raw)} (${source}) is not a percentage 0..100 — falling back to ${DEFAULT_MAX_SKIPPED_PCT}%.`);
    return { pct: DEFAULT_MAX_SKIPPED_PCT, source: `${source} (INVALID, default used)` };
  }
  return { pct: n, source };
}
const threshold = readThreshold();

// ---- what tree are we judging? -----------------------------------------------------------------
function git(...args) {
  const r = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return r.status === 0 ? (r.stdout ?? '').trim() : null;
}
const head = git('rev-parse', 'HEAD');
const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
const dirty = git('status', '--porcelain');

if (head == null) refusals.push('not a git checkout — the verdict could not name a commit.');
if (dirty) {
  if (allowDirty) {
    notes.push(`--allow-dirty: ${dirty.split('\n').length} uncommitted path(s); the measured tree is NOT ${head?.slice(0, 8)}.`);
  } else {
    refusals.push(
      `the working tree is DIRTY (${dirty.split('\n').length} path(s)) — what was measured is not what would be merged.\n` +
      '      Commit and push first, or pass --allow-dirty for a local experiment.',
    );
  }
}

// ---- run `npm test` and watch it ---------------------------------------------------------------
let log = '';
let testExit = null;

if (noRun) {
  log = readFileSync(0, 'utf8');
  notes.push('--no-run: judged a log handed in on stdin; this gate did not run `npm test` itself.');
  testExit = 0;
} else if (stages.length > 0) {
  console.error(`merge-gate: ${NAME} — running \`npm test\` in ${REPO_ROOT} …`);
  const run = spawnSync('npm', ['test'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, NEOBASE_MERGE_GATE: '1' },
  });
  if (run.error) {
    refusals.push(`\`npm test\` could not be started — ${run.error.message}`);
  }
  if (run.signal) {
    refusals.push(`\`npm test\` was killed by ${run.signal} — a killed run is not a measurement.`);
  }
  log = `${run.stdout ?? ''}\n${run.stderr ?? ''}`;
  testExit = run.status;
  process.stderr.write(run.stderr ?? '');
  if (testExit !== 0) refusals.push(`\`npm test\` exited ${testExit}.`);
}

const logLines = log.split('\n');

// ---- per-stage accounting ----------------------------------------------------------------------
const BLIND_MARKERS = [
  /NOT MEASURED/,
  /toolchain NOT installed/,
  /NOT installed/,
  /TYPE CHECK NOT MEASURED/,
];

const stageReport = [];
for (const stage of stages) {
  const own = logLines.filter((l) => l.startsWith(`${stage}:`));
  if (own.length === 0) {
    stageReport.push({ stage, status: 'UNVERIFIED', detail: 'printed no accounting line of its own' });
    refusals.push(
      `stage \`${stage}\` printed NO accounting (\`${stage}: …\`) — it cannot be verified.\n` +
      '      A stage that does not say what it checked is not evidence that it checked anything.',
    );
    continue;
  }
  const blind = own.find((l) => BLIND_MARKERS.some((re) => re.test(l)));
  if (blind) {
    stageReport.push({ stage, status: 'NOT MEASURED', detail: blind.trim() });
    refusals.push(`stage \`${stage}\` did NOT measure: ${blind.trim()}`);
    continue;
  }
  stageReport.push({ stage, status: 'measured', detail: own[own.length - 1].trim() });
}

// ---- the unit accounting, parsed for real ------------------------------------------------------
// `run-unit-tests: 41 file(s) · 845 test(s) · 843 measured · 2 skipped (0%) · toolchain installed`
const UNIT_LINE = /^run-unit-tests: (\d+) file\(s\) · (\d+) test\(s\) · (\d+) measured · (\d+) skipped \((\d+)%\) · toolchain (installed|NOT installed)/;
let unit = null;
for (const line of logLines) {
  const m = line.match(UNIT_LINE);
  if (m) {
    unit = {
      files: +m[1], tests: +m[2], measured: +m[3], skipped: +m[4], pct: +m[5],
      toolchain: m[6],
    };
  }
}
if (stages.includes('run-unit-tests')) {
  if (!unit) {
    refusals.push('the `run-unit-tests` accounting line was not found — counts NOT measured.');
  } else {
    if (unit.toolchain !== 'installed') {
      refusals.push(`the toolchain is NOT installed in ${REPO_ROOT} — nothing here is a measurement of this repo.\n      Fix:  tools/setup-host-toolchain.sh <this worktree>`);
    }
    if (unit.measured === 0) {
      refusals.push(`NOTHING MEASURED — ${unit.tests} test(s) selected, 0 measured.`);
    }
    if (unit.pct > threshold.pct) {
      refusals.push(
        `SKIP SHARE ${unit.pct}% is over the ceiling of ${threshold.pct}% (${threshold.source}).\n` +
        `      ${unit.skipped} of ${unit.tests} test(s) never asserted anything.`,
      );
    }
  }
}

// ---- verdict -----------------------------------------------------------------------------------
const allowed = refusals.length === 0;
const w = Math.max(...stages.map((s) => s.length), 12);

console.log('');
console.log(`merge-gate: ${NAME}`);
console.log(`  commit        ${head ?? '(unknown)'}${branch ? ` on ${branch}` : ''}${dirty ? '  (DIRTY)' : ''}`);
console.log(`  npm test      exit ${testExit ?? '(not run)'}`);
console.log(`  stages        ${stages.length} derived from scripts.test${stages.length ? `: ${stages.join(', ')}` : ''}`);
console.log(`  skip ceiling  ${threshold.pct}%  (${threshold.source})`);
if (unit) {
  console.log(`  unit          ${unit.files} file(s) · ${unit.tests} test(s) · ${unit.measured} measured · ${unit.skipped} skipped (${unit.pct}%) · toolchain ${unit.toolchain}`);
}
console.log('');
for (const s of stageReport) {
  console.log(`  ${s.stage.padEnd(w)}  ${(s.status === 'measured' ? 'OK' : s.status).padEnd(13)}${s.detail}`);
}
for (const n of notes) console.log(`  note          ${n}`);
console.log('');

if (allowed) {
  console.log('merge-gate: MERGE ALLOWED — every derived stage measured, and it said what it measured.');
} else {
  console.log(`merge-gate: MERGE REFUSED — ${refusals.length} reason(s):`);
  for (const r of refusals) console.log(`    · ${r}`);
  console.log('');
  console.log('  This run is NOT a gate. Do not quote it, and do not merge on it.');
}
console.log('');

if (!allowed) process.exit(1);

// ---- the short path: gate, then merge ----------------------------------------------------------
if (prNumber != null) {
  const gh = (...args) => {
    console.error(`merge-gate: gh ${args.join(' ')}`);
    const r = spawnSync('gh', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['inherit', 'inherit', 'inherit'] });
    if (r.error) { console.error(`merge-gate: gh could not be started — ${r.error.message}`); process.exit(1); }
    return r.status;
  };
  // A draft PR is un-mergeable server-side; flipping it ready is the act this gate authorises.
  if (gh('pr', 'ready', prNumber) !== 0) {
    console.error(`merge-gate: \`gh pr ready ${prNumber}\` failed — not merging.`);
    process.exit(1);
  }
  if (gh('pr', 'merge', prNumber, '--merge', '--delete-branch') !== 0) {
    console.error(`merge-gate: \`gh pr merge ${prNumber}\` failed.`);
    process.exit(1);
  }
  console.log(`merge-gate: PR #${prNumber} merged on a measured gate (${head?.slice(0, 8)}).`);
}
