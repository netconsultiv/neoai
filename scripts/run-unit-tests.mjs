#!/usr/bin/env node
/**
 * Runs this repo's `node:test` suites — and REFUSES to be green over a suite that measured nothing.
 *
 * ---- WHY THIS EXISTS, PART 1: THE EMPTY SELECTION (2026-07-31, tickets 5da7f55f / 03bd13bd) -----
 *
 * Measured on Node v22.23.1:
 *
 *     $ node --test "test/nothing-*.test.mjs"
 *     TAP version 13
 *     1..0
 *     # tests 0
 *     # fail 0
 *     $ echo $?
 *     0
 *
 * **A glob that selects no file at all runs zero tests and exits 0.** Quoting the glob (so Node and
 * not the shell expands it) fixes portability, and portability only — it does not fix this. The
 * previous first stage here was an UNQUOTED `node --test test/*.test.mjs`, which meant the shell
 * decided the scope; from a directory where the pattern matched nothing it was handed through
 * literally and Node then reported the same silent 0-tests/exit-0.
 *
 * Either way the outcome is the failure class this repo has now paid for four times: a checking
 * tool that reports success without having checked (see `scripts/lib/gate-verdict.mjs` for the
 * pixel-gate instance of the same defect, and the project convention
 * "tests-pruefen-invarianten-nicht-umgebung" for the branding and cloudflare instances).
 *
 * ---- WHY THIS EXISTS, PART 2: THE EMPTY MEASUREMENT (2026-08-02, BÜNDEL BI) ----------------------
 *
 * Guarding the SELECTION is not the same as guarding the MEASUREMENT, and the gap between the two
 * is where this family's next green lie lived. Measured 2026-08-02 in a fresh `origin/develop`
 * clone, with no `npm install`:
 *
 *     design-studio f0fac73   npm test  ->  736 tests · 66 pass · 0 fail · 670 SKIPPED · exit 0
 *     design-studio f0fac73   npm test  ->  736 tests · 735 pass · 0 fail ·   1 skipped · exit 0
 *                                           (the second line is the same commit, after npm install)
 *
 * The selection was not empty — 33 files, all found, all executed. Every one of the 670 skips was
 * individually HONEST: each names its missing optional dependency, and the convention
 * "optionale-abhaengigkeiten-in-tests" even requires a per-file `assertSkipIsHonest` guard proving
 * the dependency really is absent. All of that worked. And the run still reported a clean green
 * over **9 % of its own suite**, because nothing anywhere counted the skips in aggregate.
 *
 * > A per-test skip guard answers "is this skip honest?". It cannot answer "did this RUN measure
 * > enough to mean anything?" — that question has no owner unless something asks it here.
 *
 * ---- THE RULE, AND WHY IT IS NOT SIMPLY "SKIPS ARE RED" ------------------------------------------
 *
 * House norm (Ben, 2026-08-01, Frage 18): **a red `npm test` must ALWAYS mean a real defect, never
 * merely a missing installation.** Turning "670 skipped" into exit 1 on a bare checkout would break
 * that norm, and it would break it in the direction that trains people to ignore red.
 *
 * So the discriminator is not the skip count, it is whether the skips are still EXCUSABLE:
 *
 *   toolchain NOT installed  ->  skips are excused. Print the ratio, loudly and unmissably, and
 *                                hand back the child's own exit code. Nothing is invented.
 *   toolchain IS installed   ->  "not installed" is no longer an available excuse. A suite that
 *                                measured nothing, or that skipped more than this repo has
 *                                DECLARED it may skip, is a defect and exits non-zero.
 *
 * That is exactly `assertSkipIsHonest` promoted from per-file to per-run, and it costs nothing at
 * the forcing point: `./sandbox.sh test-sweep` runs `npm ci` where a lockfile exists and
 * `npm install` everywhere else, so the unattended sweep always lands in the strict arm.
 *
 * The declaration is `--max-skipped N`, written in `package.json` right next to the patterns, where
 * it shows up in the diff of any PR that widens it. It is a CEILING and it ratchets: raising it is
 * a visible, reviewable edit. Default 0.
 *
 * ---- WHAT THIS DOES -----------------------------------------------------------------------------
 *
 *   1. Expands the patterns ITSELF, with `fs.globSync` — same matcher semantics as `node --test`
 *      (`*` does not cross a `/`), but under this script's control and independent of the shell,
 *      the working directory and the platform.
 *   2. NAMES the resolved set on stderr. "Which files ran" stops being something you have to infer
 *      from the TAP output.
 *   3. Exits NON-ZERO, loudly, when the set is empty.
 *   4. Hands `node --test` the resolved FILES, not the patterns. A file that vanishes between the
 *      expansion and the run is then a hard error instead of a silent shrink.
 *   5. Reads the TAP counters back off the child's stdout and prints the ACCOUNTING: tests,
 *      measured, skipped, and the skipped share. A count nobody prints is a count nobody checks.
 *   6. Refuses, per the rule above, when an installed tree measured nothing or over-skipped.
 *
 * stdout is forwarded byte-for-byte and stays pure TAP — `sandbox.sh test-sweep` parses those
 * counters, so this script may observe them but must never rewrite them. Diagnostics go to stderr.
 */
import { globSync, existsSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { constants } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

// `--max-skipped N` is consumed HERE and must not reach `node --test`, which would reject it.
let maxSkipped = 0;
const rest = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  const inline = arg.match(/^--max-skipped=(\d+)$/);
  if (inline) { maxSkipped = Number(inline[1]); continue; }
  if (arg === '--max-skipped') {
    const value = argv[++i];
    if (!/^\d+$/.test(value ?? '')) {
      console.error(`run-unit-tests: --max-skipped needs a non-negative integer, got ${JSON.stringify(value)}.`);
      process.exit(2);
    }
    maxSkipped = Number(value);
    continue;
  }
  rest.push(arg);
}

const patterns = rest.filter((arg) => !arg.startsWith('-'));
const nodeFlags = rest.filter((arg) => arg.startsWith('-'));

if (patterns.length === 0) {
  console.error(
    'run-unit-tests: no pattern given.\n' +
    '  Usage: node scripts/run-unit-tests.mjs [--max-skipped N] "test/*.test.mjs" ["test/*/*.test.mjs" ...]\n' +
    '  Quote the patterns: THIS script expands them, not the shell.',
  );
  process.exit(2);
}

const files = [...new Set(patterns.flatMap((pattern) => globSync(pattern, { cwd: REPO_ROOT })))]
  .map((file) => file.split('\\').join('/'))
  .sort();

if (files.length === 0) {
  console.error(
    `run-unit-tests: EMPTY SELECTION — the pattern(s) ${patterns.map((p) => `"${p}"`).join(' ')} matched no file.\n` +
    '  `node --test` would have run 0 tests and exited 0, i.e. reported success for a suite that\n' +
    '  never executed. That is not a pass, it is an unmeasured run — refusing.\n' +
    `  Looked in: ${REPO_ROOT}`,
  );
  process.exit(1);
}

console.error(`run-unit-tests: ${files.length} file(s) selected by ${patterns.length} pattern(s):`);
for (const file of files) console.error(`  · ${file}`);

// "Installed" is a POPULATED node_modules, never merely a present one. In the shared main checkout
// every plugin's node_modules is an EMPTY root-owned docker mountpoint, not an installation
// ([[host-toolchain-fuer-plugin-repos]]); a bare existsSync would read those as installed and put
// this script into the strict arm on a tree that cannot possibly pass it.
const nodeModules = join(REPO_ROOT, 'node_modules');
let installed = false;
try { installed = existsSync(nodeModules) && readdirSync(nodeModules).length > 0; } catch { installed = false; }

const child = spawn(process.execPath, ['--test', ...nodeFlags, ...files], { cwd: REPO_ROOT, stdio: ['inherit', 'pipe', 'inherit'] });

// Forward stdout untouched and read the TAP summary off the same bytes. Counters are matched
// anchored and summed: a `test` script may chain several runners into one log.
const counters = { tests: 0, pass: 0, fail: 0, skipped: 0, seen: false };
let carry = '';
const COUNTER_LINE = /^# (tests|pass|fail|skipped) (\d+)$/;
child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  const text = carry + chunk.toString('utf8');
  const lines = text.split('\n');
  carry = lines.pop() ?? '';
  for (const line of lines) {
    const m = line.match(COUNTER_LINE);
    if (m) { counters[m[1]] += Number(m[2]); counters.seen = true; }
  }
});

const [code, signal] = await new Promise((res, rej) => {
  child.on('error', rej);
  child.on('close', (c, s) => res([c, s]));
}).catch((error) => {
  console.error(`run-unit-tests: could not start the test runner: ${error.message}`);
  process.exit(1);
});

const trailing = carry.match(COUNTER_LINE);
if (trailing) { counters[trailing[1]] += Number(trailing[2]); counters.seen = true; }

// A run killed by a signal must never look like a clean exit — `timeout` relies on this.
if (signal) {
  console.error(`run-unit-tests: the test runner was killed by ${signal}`);
  process.exit(128 + (constants.signals[signal] || 0));
}

const measured = counters.pass + counters.fail;
const share = counters.tests > 0 ? Math.round((counters.skipped / counters.tests) * 100) : 0;

if (!counters.seen) {
  // No TAP summary at all. Never guess a number here: an invented count is worse than none.
  console.error('run-unit-tests: no TAP summary found in the run output — counts NOT measured.');
  process.exit(code == null ? 1 : code);
}

console.error(
  `run-unit-tests: ${files.length} file(s) · ${counters.tests} test(s) · ${measured} measured · ` +
  `${counters.skipped} skipped (${share}%) · toolchain ${installed ? 'installed' : 'NOT installed'}`,
);

if (!installed) {
  if (counters.skipped > maxSkipped) {
    console.error(
      `\n  ⚠ THIS RUN MEASURED ${measured} OF ${counters.tests} TEST(S) — ${counters.skipped} skipped (${share}%).\n` +
      '    The dependencies are not installed in this tree, so the skips are excused and this is\n' +
      '    NOT reported as a defect (house norm: a red `npm test` always means a real defect,\n' +
      '    never a missing installation). But it is also NOT a measurement of this repo.\n' +
      '\n    Do not quote this run as evidence. To measure for real:\n' +
      '\n        npm install && npm test\n',
    );
  }
  process.exit(code == null ? 1 : code);
}

// ---- installed tree: "not installed" is no longer an available excuse -------------------------
if (code === 0 && measured === 0) {
  console.error(
    `\nrun-unit-tests: NOTHING MEASURED — ${counters.tests} test(s) selected and executed, ` +
    `${counters.skipped} of them skipped, 0 measured.\n` +
    '  The dependencies ARE installed here, so this is not an environment gap: every test in this\n' +
    '  suite declined to assert anything, and the run would otherwise have reported success.\n' +
    '  That is a green gate over an unmeasured suite — refusing.',
  );
  process.exit(1);
}

if (code === 0 && counters.skipped > maxSkipped) {
  console.error(
    `\nrun-unit-tests: OVER THE SKIP BUDGET — ${counters.skipped} test(s) skipped, ` +
    `this repo declares at most ${maxSkipped}.\n` +
    '  The dependencies ARE installed, so a skip here is a property of the REPO, not of the box.\n' +
    '  Either fix what is skipping, or raise the ceiling deliberately and visibly:\n' +
    `      "test": "node scripts/run-unit-tests.mjs --max-skipped ${counters.skipped} ..."\n` +
    '  Raising it is a reviewable edit in package.json. Silently skipping is not.',
  );
  process.exit(1);
}

process.exit(code == null ? 1 : code);
