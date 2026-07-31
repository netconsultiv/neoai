// test/npm-test-scope.test.mjs
// -----------------------------------------------------------------------------
// Guards the ONE property that makes `npm test` usable as a gate: it must run a
// deliberately chosen, COMPLETE set of files, it must terminate, and it must be
// RED over an empty selection.
//
// Why the last one exists. `scripts.test` here used to read
//
//     node --test "test/*.test.mjs"
//
// Quoted — so the shell does not decide the scope, which is the smaller half of
// the problem. The bigger half survives quoting, and was measured on 2026-07-31
// with Node v22.23.x, in THIS repo:
//
//     $ mv test test.aus && npm test; echo $?
//     # tests 0
//     0
//
// **A pattern that matches nothing runs zero tests and exits 0.** A gate that
// reports success without having checked is worth less than no gate: in a run
// across all eleven plugin repos it is indistinguishable from real coverage.
// The repair is `scripts/run-unit-tests.mjs`, which expands the patterns itself,
// NAMES the files it selected on stderr and REFUSES an empty set; this guard is
// what keeps that in place. See the project convention
// "tests-pruefen-invarianten-nicht-umgebung".
//
// Two further ways the selection can go wrong silently, both measured on
// 2026-07-28 in the sibling repos:
//
//   * A SUITE IN A SUBDIRECTORY. `test/*.test.mjs` does not cross a `/`, for
//     Node's matcher just as for the one below. A suite filed under `test/unit/`
//     is therefore never executed, and a deliberately FAILING one still left
//     `npm test` at exit 0. The walk below is recursive so that case is red.
//   * `--test-force-exit`. It makes a suite that holds the event loop open exit
//     green, which is the cloudflare hang wearing a disguise: that repo's
//     `test/mock-cf-server.js` calls `server.listen()` as the main module, so a
//     run that picks it up never returns at all.
//
// Everything asserted here is a property of the COMMITTED repo (package.json and
// the contents of test/). No network, no subprocess, no assumption about the
// shape of the checkout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TEST_DIR, '..');

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
const testScript = pkg.scripts?.test ?? '';

/** The chain, one entry per `&&`-separated stage. */
const stages = testScript.split('&&').map((stage) => stage.trim()).filter(Boolean);

/** The stage that runs the node:test suites in test/ — recognised by FORM, not by position. */
const unitStage = stages.find((stage) => /run-unit-tests\.mjs|--test(\s|$)/.test(stage)) ?? '';

/** Positional arguments of a stage, i.e. everything that is not the binary and
 *  not a flag. Quotes are stripped: the script quotes the globs so the RUNNER,
 *  never the shell, expands them — on every platform, including ones whose
 *  shell does not glob at all. */
function positionalArgs(stage) {
  return stage
    .split(/\s+/)
    .filter(Boolean)
    .slice(1) // drop "node"
    .filter((a) => !a.startsWith('-'))
    .map((a) => a.replace(/^["']|["']$/g, ''))
    .filter((a) => !a.endsWith('.mjs') || a.startsWith('test/')); // drop the runner's own path
}

/** Minimal glob matcher: only `*` (which does not cross `/`) is supported, which
 *  is all the patterns are allowed to use. That limitation mirrors Node's own
 *  matcher and `fs.globSync`, and is what makes a suite in a subdirectory show
 *  up as uncovered below instead of disappearing. */
function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

/** Every file under test/, RECURSIVELY, as a repo-root-relative POSIX path. */
function walk(dir, prefix) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(join(dir, entry.name), rel));
    else if (entry.isFile()) found.push(rel);
  }
  return found;
}

const patterns = positionalArgs(unitStage);
const entries = walk(TEST_DIR, 'test');
const unitSuites = entries.filter((f) => f.endsWith('.test.mjs'));
const helpers = entries.filter((f) => !f.endsWith('.test.mjs'));
const selected = entries.filter((f) => patterns.some((p) => globToRegExp(p).test(f)));

test('npm test runs the node test runner over test/', () => {
  assert.ok(unitStage, `no stage of scripts.test runs the node test suites: ${testScript}`);
  assert.match(unitStage, /(^|\s)node(\s|$)/, `the unit stage does not run node: ${unitStage}`);
});

test('npm test names the files to run instead of leaving the choice to node or the shell', () => {
  assert.ok(
    patterns.length > 0,
    'the unit stage passes no pattern: Node then falls back to its default search ' +
      'patterns, which also pull in every non-test file under test/ — one long-lived ' +
      'helper there and the run never terminates. ' +
      'Pass an explicit glob, e.g. node scripts/run-unit-tests.mjs "test/*.test.mjs".',
  );
});

test('the globs are QUOTED so the shell never decides the scope', () => {
  // An unquoted glob is expanded by whatever shell npm happens to use, from whatever
  // working directory it happens to be in — the scope becomes an environment fact.
  for (const pattern of patterns) {
    if (!pattern.includes('*')) continue;
    assert.match(
      unitStage,
      new RegExp(`["']${pattern.replace(/[.*+^${}()|[\]\\]/g, '\\$&')}["']`),
      `glob ${pattern} is not quoted in scripts.test — the shell, not this repo, then decides ` +
        'which files run. Quote it: node scripts/run-unit-tests.mjs "test/*.test.mjs".',
    );
  }
});

test('an EMPTY selection cannot be green — the unit stage goes through the refusing runner', () => {
  // Measured 2026-07-31, Node v22.23.1: `node --test "<pattern matching nothing>"` reports
  // 0 tests and exits 0. Quoting does not help; only a runner that counts its own selection does.
  assert.ok(
    existsSync(join(REPO_ROOT, 'scripts/run-unit-tests.mjs')),
    'scripts/run-unit-tests.mjs is missing — nothing then stops `npm test` from being green ' +
      'over zero executed files.',
  );
  assert.match(
    unitStage,
    /run-unit-tests\.mjs/,
    'the unit stage calls `node --test` directly. A pattern that matches nothing then runs 0 ' +
      'tests and exits 0. Route it through scripts/run-unit-tests.mjs, which refuses an empty set: ' +
      `${unitStage}`,
  );
});

test('every file npm test selects lives in test/ and follows the *.test.mjs convention', () => {
  for (const p of patterns) {
    assert.ok(p.startsWith('test/'), `test pattern must stay inside test/: ${p}`);
    assert.ok(p.endsWith('.test.mjs'), `test pattern must select *.test.mjs files: ${p}`);
  }
});

test('test/ actually contains a suite — a green run over zero files is not a gate', () => {
  assert.ok(
    unitSuites.length > 0,
    'no *.test.mjs found in test/. `npm test` would report 0 tests and exit 0, which ' +
      'in a run across all plugin repos is indistinguishable from real coverage.',
  );
});

test('npm test covers every suite in test/, subdirectories included — none is silently left out', () => {
  const missed = unitSuites.filter((f) => !selected.includes(f));
  assert.deepEqual(
    missed,
    [],
    `these suites exist but npm test would not run them: ${missed.join(', ')}. ` +
      'Keep the pattern a glob rather than a hand-written file list — and note that ' +
      '`test/*.test.mjs` does not cross a "/", so a suite under test/<subdir>/ needs ' +
      'its own pattern (e.g. "test/*.test.mjs" "test/*/*.test.mjs").',
  );
});

test('npm test excludes every non-test helper in test/ — this is what hangs the run', () => {
  const wrongly = helpers.filter((f) => selected.includes(f));
  assert.deepEqual(
    wrongly,
    [],
    `npm test would execute non-test files: ${wrongly.join(', ')}. ` +
      'Anything in test/ that is not a *.test.mjs unit suite (mock servers, fixtures, ' +
      'seed or end-to-end scripts) must stay out of npm test and get its own npm script.',
  );
});

test('npm test does not paper over a hanging suite with --test-force-exit', () => {
  assert.doesNotMatch(
    testScript,
    /--test-force-exit/,
    'scripts.test uses --test-force-exit. That flag reports a suite which keeps the ' +
      'event loop open as green, i.e. it hides exactly the defect this file exists to catch.',
  );
});

// ---- IF THIS EVER BECOMES A CHAIN --------------------------------------------
// design-studio's `npm test` is ONE stage today. The moment a second is added,
// the chain gets its own way of going quiet: a stage drops out and everything
// else stays green. The rule below is what makes that loud.

test('the stages are joined by && — a stage that cannot stop the run is not a gate', () => {
  assert.ok(stages.length >= 1, `scripts.test is empty: ${testScript}`);
  assert.doesNotMatch(
    testScript,
    /(^|[^&|])[;|](?![|])/,
    'scripts.test joins stages with ";" or "|" somewhere: a red stage then does not stop the ' +
      `run and its exit code is lost. Use "&&" only: ${testScript}`,
  );
  assert.doesNotMatch(testScript, /\|\|/, `scripts.test contains "||", which swallows a red stage: ${testScript}`);
});
