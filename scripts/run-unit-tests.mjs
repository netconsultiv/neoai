#!/usr/bin/env node
/**
 * Runs this repo's `node:test` suites — and REFUSES to be green over an empty selection.
 *
 * ---- WHY THIS EXISTS (2026-07-31, tickets 5da7f55f / 03bd13bd) ---------------------------------
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
 * ---- WHAT THIS DOES ---------------------------------------------------------------------------
 *
 *   1. Expands the patterns ITSELF, with `fs.globSync` — same matcher semantics as `node --test`
 *      (`*` does not cross a `/`), but under this script's control and independent of the shell,
 *      the working directory and the platform.
 *   2. NAMES the resolved set on stderr. "Which files ran" stops being something you have to infer
 *      from the TAP output.
 *   3. Exits NON-ZERO, loudly, when the set is empty. That is the whole point.
 *   4. Hands `node --test` the resolved FILES, not the patterns. A file that vanishes between the
 *      expansion and the run is then a hard error instead of a silent shrink.
 *
 * Diagnostics go to stderr so stdout stays pure TAP — `sandbox.sh test-sweep` parses those counters.
 */
import { globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { constants } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const patterns = argv.filter((arg) => !arg.startsWith('-'));
const nodeFlags = argv.filter((arg) => arg.startsWith('-'));

if (patterns.length === 0) {
  console.error(
    'run-unit-tests: no pattern given.\n' +
    '  Usage: node scripts/run-unit-tests.mjs "test/*.test.mjs" ["test/*/*.test.mjs" ...]\n' +
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

const result = spawnSync(process.execPath, ['--test', ...nodeFlags, ...files], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`run-unit-tests: could not start the test runner: ${result.error.message}`);
  process.exit(1);
}
// A run killed by a signal must never look like a clean exit — `timeout` relies on this.
if (result.signal) {
  console.error(`run-unit-tests: the test runner was killed by ${result.signal}`);
  process.exit(128 + (constants.signals[result.signal] || 0));
}
process.exit(result.status == null ? 1 : result.status);
