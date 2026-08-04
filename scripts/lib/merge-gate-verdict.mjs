/**
 * merge-gate-verdict — the DECISION half of `scripts/merge-gate.mjs`, as pure functions.
 *
 * Everything in this file is a total function of its arguments: no fs, no git, no subprocess, no
 * environment. That is not tidiness, it is what makes the gate testable at all under the project
 * convention "tests-pruefen-invarianten-nicht-umgebung" — crm's `test/tests-are-offline.test.mjs`
 * forbids a suite from importing `child_process`, and it is right to: a gate whose own test has to
 * shell out is red whenever the box is busy, and "red" then stops meaning anything.
 *
 * `scripts/merge-gate.mjs` keeps everything impure — arguments, git, spawning `npm test`, `gh` —
 * and asks this module the one question that matters: given what that run PRINTED, may it be
 * merged on?
 *
 * The full rationale for the rules lives in the header of `scripts/merge-gate.mjs`.
 */

export const DEFAULT_MAX_SKIPPED_PCT = 0;

/** Lines a guard prints when it EXCUSED itself instead of measuring. */
export const BLIND_MARKERS = [
  /NOT MEASURED/,
  /toolchain NOT installed/,
  /NOT installed/,
];

/**
 * `run-unit-tests`' accounting line, the one number-bearing sentence every plugin repo prints:
 * `run-unit-tests: 41 file(s) · 845 test(s) · 843 measured · 2 skipped (0%) · toolchain installed`
 */
export const UNIT_LINE =
  /^run-unit-tests: (\d+) file\(s\) · (\d+) test\(s\) · (\d+) measured · (\d+) skipped \((\d+)%\) · toolchain (installed|NOT installed)/;

/**
 * Derive the stages of a script chain from `package.json` → `scripts`.
 *
 * A stage is anything invoked as `node scripts/<name>.mjs`; `npm run <x>` is resolved through
 * `scripts.<x>` recursively (konfigurator chains `npm run typecheck` inside its `test`). Derived,
 * never hand-kept: a hand-kept list of "which steps" has drifted from the thing it described three
 * times in this repo family (see `scripts/check-build.mjs` rule 1).
 */
export function deriveStages(scriptName, scripts, seen = new Set()) {
  if (seen.has(scriptName)) return [];
  seen.add(scriptName);
  const body = scripts?.[scriptName];
  if (typeof body !== 'string') return [];
  const stages = [...body.matchAll(/node\s+scripts\/([A-Za-z0-9._-]+)\.mjs/g)].map((m) => m[1]);
  for (const m of body.matchAll(/npm\s+run\s+([A-Za-z0-9:._-]+)/g)) {
    stages.push(...deriveStages(m[1], scripts, seen));
  }
  return stages;
}

/** The stages `npm test` chains, minus the gate itself (which would recurse). */
export function testStages(pkg) {
  return [...new Set(deriveStages('test', pkg?.scripts))].filter((s) => s !== 'merge-gate');
}

/**
 * The skip ceiling: `env || package.json || default`, the house precedence.
 *
 * A BROKEN value falls back to the DEFAULT, never to something permissive
 * ([[einstellbar-statt-hartkodiert]]: "auch ein kaputter Wert muss den sicheren Zustand ergeben").
 * An env var set to the empty string counts as ABSENT, not as 0 — otherwise exporting it empty
 * would silently override the repo's own declaration.
 */
export function readThreshold(env, pkg) {
  const fromEnv = env?.NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT || undefined;
  const fromPkg = pkg?.neobaseMergeGate?.maxSkippedPercent;
  const source = fromEnv != null
    ? 'env NEOBASE_MERGE_GATE_MAX_SKIPPED_PCT'
    : fromPkg != null
      ? 'package.json neobaseMergeGate.maxSkippedPercent'
      : 'default';
  const raw = fromEnv ?? fromPkg;
  if (raw == null || raw === '') return { pct: DEFAULT_MAX_SKIPPED_PCT, source: 'default' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return {
      pct: DEFAULT_MAX_SKIPPED_PCT,
      source: `${source} (INVALID, default used)`,
      invalid: String(raw),
    };
  }
  return { pct: n, source };
}

/** The last `run-unit-tests` accounting line in a log, parsed. `null` when there is none. */
export function parseUnitAccounting(logLines) {
  let unit = null;
  for (const line of logLines) {
    const m = line.match(UNIT_LINE);
    if (m) {
      unit = {
        files: +m[1], tests: +m[2], measured: +m[3], skipped: +m[4], pct: +m[5], toolchain: m[6],
      };
    }
  }
  return unit;
}

/**
 * The verdict.
 *
 * @param {object}  input
 * @param {object}  input.pkg        parsed package.json of the repo under judgement
 * @param {string}  input.log        everything `npm test` wrote (stdout + stderr)
 * @param {number}  input.testExit   its exit code (null = it was never run)
 * @param {object}  input.env        the environment, for the threshold override
 * @param {boolean} input.dirty      does the working tree carry uncommitted changes?
 * @param {boolean} input.allowDirty was --allow-dirty passed?
 * @param {boolean} input.isRepo     is this a git checkout at all?
 * @param {string=} input.repoPath   printed in the "install the toolchain" hint
 * @returns {{allowed:boolean, refusals:string[], notes:string[], stageReport:object[],
 *            stages:string[], unit:object|null, threshold:object}}
 */
export function judge({
  pkg, log = '', testExit = null, env = {}, dirty = false, allowDirty = false,
  isRepo = true, repoPath = '.',
}) {
  const refusals = [];
  const notes = [];
  const stages = testStages(pkg);
  const threshold = readThreshold(env, pkg);
  const logLines = log.split('\n');

  if (threshold.invalid != null) {
    notes.push(`the configured skip ceiling ${JSON.stringify(threshold.invalid)} is not a percentage 0..100 — falling back to ${DEFAULT_MAX_SKIPPED_PCT}%.`);
  }

  // ---- is there anything to gate on at all? ----------------------------------------------------
  if (typeof pkg?.scripts?.test !== 'string') {
    refusals.push('this repo declares no `test` script — there is nothing to gate on.');
  } else if (stages.length === 0) {
    refusals.push(
      `\`scripts.test\` derives NO stage: ${JSON.stringify(pkg.scripts.test)}\n` +
      '      A gate over an empty selection is not a pass, it is an unmeasured run.',
    );
  }

  // ---- does the verdict name a commit that exists? ---------------------------------------------
  if (!isRepo) refusals.push('not a git checkout — the verdict could not name a commit.');
  if (dirty) {
    if (allowDirty) notes.push('--allow-dirty: the measured tree is NOT the commit named above.');
    else {
      refusals.push(
        'the working tree is DIRTY — what was measured is not what would be merged.\n' +
        '      Commit and push first, or pass --allow-dirty for a local experiment.',
      );
    }
  }

  if (testExit != null && testExit !== 0) refusals.push(`\`npm test\` exited ${testExit}.`);

  // ---- per stage: did it say what it checked? --------------------------------------------------
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

  // ---- the unit accounting, parsed for real ----------------------------------------------------
  const unit = parseUnitAccounting(logLines);
  if (stages.includes('run-unit-tests')) {
    if (!unit) {
      refusals.push('the `run-unit-tests` accounting line was not found — counts NOT measured.');
    } else {
      if (unit.toolchain !== 'installed') {
        refusals.push(
          `the toolchain is NOT installed in ${repoPath} — nothing here is a measurement of this repo.\n` +
          '      Fix:  tools/setup-host-toolchain.sh <this worktree>',
        );
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

  return { allowed: refusals.length === 0, refusals, notes, stageReport, stages, unit, threshold };
}

/** The printed verdict block. Pure: it renders, it does not decide. */
export function formatVerdict(verdict, { name, head, branch, dirty, testExit }) {
  const { stages, stageReport, unit, threshold, notes, refusals, allowed } = verdict;
  const w = Math.max(12, ...stages.map((s) => s.length));
  const out = [''];
  out.push(`merge-gate: ${name}`);
  out.push(`  commit        ${head ?? '(unknown)'}${branch ? ` on ${branch}` : ''}${dirty ? '  (DIRTY)' : ''}`);
  out.push(`  npm test      exit ${testExit ?? '(not run)'}`);
  out.push(`  stages        ${stages.length} derived from scripts.test${stages.length ? `: ${stages.join(', ')}` : ''}`);
  out.push(`  skip ceiling  ${threshold.pct}%  (${threshold.source})`);
  if (unit) {
    out.push(`  unit          ${unit.files} file(s) · ${unit.tests} test(s) · ${unit.measured} measured · ${unit.skipped} skipped (${unit.pct}%) · toolchain ${unit.toolchain}`);
  }
  out.push('');
  for (const s of stageReport) {
    out.push(`  ${s.stage.padEnd(w)}  ${(s.status === 'measured' ? 'OK' : s.status).padEnd(13)}${s.detail}`);
  }
  for (const n of notes) out.push(`  note          ${n}`);
  out.push('');
  if (allowed) {
    out.push('merge-gate: MERGE ALLOWED — every derived stage measured, and it said what it measured.');
  } else {
    out.push(`merge-gate: MERGE REFUSED — ${refusals.length} reason(s):`);
    for (const r of refusals) out.push(`    · ${r}`);
    out.push('');
    out.push('  This run is NOT a gate. Do not quote it, and do not merge on it.');
  }
  out.push('');
  return out.join('\n');
}
