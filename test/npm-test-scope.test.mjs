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
// The character scanner every guard in this repo already uses: it returns a mask of
// the same length ('c' code, 'k' comment, 's' string, 't' template text, 'r' regex).
// The skip census below reads it so a `t.skip()` written in a COMMENT is not counted
// as a skip site — measured 2026-08-02, BÜNDEL BO. See "kommentar-entferner-in-waechtern".
import { scan } from './lib/strip-census.mjs';

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
// Flags of run-unit-tests.mjs that consume the NEXT token as their value. Dropping the flag
// but keeping its value would leave a bare `1` in the pattern list, and the "every pattern lives
// in test/" assertion below would then fail on an argument that was never a pattern.
const VALUE_FLAGS = new Set(['--max-skipped']);

function positionalArgs(stage) {
  const tokens = stage.split(/\s+/).filter(Boolean).slice(1); // drop "node"
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (VALUE_FLAGS.has(token)) { i++; continue; }  // skip the flag AND its value
    if (token.startsWith('-')) continue;            // `--flag=value` and node flags
    out.push(token);
  }
  return out
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

// ---- THE SKIP BUDGET IS A LIST, NOT A NUMBER --------------------------------
// `scripts/run-unit-tests.mjs` counts skips in the SUM and refuses a run that
// skipped more than this repo declares (`--max-skipped N`, BÜNDEL BI). That
// closed the hole where individually honest skips added up to a green gate over
// a suite that had measured almost nothing.
//
// It left a smaller one open, and BÜNDEL BM walked into it in design-studio: a
// bare number does not know WHICH tests may skip.
//
//   * The number can be WRONG and nobody notices, because a skip count is a
//     property of the LAYOUT the run happened in, not of the repo. Measured
//     2026-08-02 (BÜNDEL BO) on this very repo family, same commits, `npm ci &&
//     npm test` both times, the only difference being what sat NEXT to the clone:
//
//         repo          with the other 10 plugins as siblings   ALONE in its own dir
//         crm                                     1 skipped                3 skipped
//         branding                                1 skipped                2 skipped
//         table-views                             0 skipped                1 skipped
//
//     `sandbox.sh test-sweep` and every merge gate clone a repo ALONE. A ceiling
//     calibrated in the other layout is off by exactly the amount that makes it
//     unreachable — which is how design-studio spent 2026-08-02 unmergeable.
//   * A slot that frees up is silently reusable. The moment a sibling IS checked
//     out, the named skips below stop firing and the budget absorbs brand-new
//     skips of any kind, with no diff to review.
//
// So the ceiling is DERIVED from the named list below, and the list — not the
// number — is the guard. BÜNDEL BM's negative control is the reason: an
// undeclared extra skip passed the bare number and is caught only by the census.
//
// Each entry declares WHY it may skip, and that `kind` is what its budget means:
//
//   'sibling'      the missing thing is another @neomodul repository (a sibling
//                  checkout or a git submodule). No edit inside this repo can
//                  make it present, and vendoring it is the cross-repo import
//                  the house forbids. FIRES in the gate layout -> budget 1.
//   'environment'  the missing thing is a capability of the BOX (a running
//                  stack, an IPv6 loopback). It may or may not be there; the
//                  budget must have room for the absent case, because a red
//                  `npm test` must always mean a real defect and never a thin
//                  machine. May fire -> budget 1.
//   'dependency'   an optional npm package. The gate runs `npm ci` first, so it
//                  is installed there and this site CANNOT fire -> budget 0.
//                  If it fires anyway, the run is over budget and refused —
//                  which is exactly the wanted verdict.
//
// A skip whose cause lives INSIDE this repo belongs on no list: it is a gap
// wearing a green tick, and the repair is to fix what is missing.
const ALLOWED_SKIPS = [];;

const BUDGET_BY_KIND = { sibling: 1, environment: 1, dependency: 0 };

/** `--max-skipped N` / `--max-skipped=N` as the unit stage actually declares it. */
const declaredCeiling = Number(unitStage.match(/--max-skipped[=\s]+(\d+)/)?.[1] ?? 0);

// Built at runtime so this census cannot match its own source: the literal below
// never contains the call it looks for.
const SKIP_CALL = String.raw`\bt\s*\.\s*skip\s*\(`;
const TEST_DECL = /(?:^|\n)\s*test\(\s*(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;

// A census that greps raw source counts COMMENTS as findings. Measured while
// writing this (BÜNDEL BO): pdf-generator's server-contract.test.mjs documents
// its own behaviour with the words `t.skip()` in a comment, and a raw grep
// reported a skip site in a test that has none. Every repo already ships the
// character scanner this project standardised on — mask char 'c' is live code,
// 'k' is a comment, 's'/'t'/'r' are string, template text and regex literals —
// so the census reads the same masked source every other guard here does.
// See the project note "kommentar-entferner-in-waechtern".
const maskOf = (src) => scan(src);

/** Declared submodule paths, repo-root-relative. A submodule directory sits
 *  inside this checkout but its CONTENT belongs to another repository, so a
 *  lookup into one is a lookup outside this repo in every sense that matters. */
const SUBMODULE_PATHS = (() => {
  const file = join(REPO_ROOT, '.gitmodules');
  if (!existsSync(file)) return [];
  return [...readFileSync(file, 'utf8').matchAll(/^\s*path\s*=\s*(.+)$/gm)].map((m) => m[1].trim());
})();

/** Every LIVE skip call in the suites, deduplicated per (file, owning test).
 *  A test that skips through several early returns is still one test that can
 *  skip once — counting the call sites would inflate the budget. */
function skipSites() {
  const byKey = new Map();
  for (const file of unitSuites) {
    const src = readFileSync(join(REPO_ROOT, file), 'utf8');
    const mask = maskOf(src);
    const decls = [...src.matchAll(TEST_DECL)]
      .map((m) => ({ at: m.index, name: m[2] }))
      .filter((d) => mask[src.indexOf('test(', d.at)] === 'c');
    for (const call of src.matchAll(new RegExp(SKIP_CALL, 'g'))) {
      if (mask[call.index] !== 'c') continue;      // a comment is not a skip site
      const owner = [...decls].reverse().find((d) => d.at < call.index);
      const site = {
        file,
        name: owner?.name ?? '<TOP-LEVEL>',
        src,
        mask,
        call: src.slice(call.index, src.indexOf('\n', call.index)),
      };
      const k = `${site.file} :: ${site.name}`;
      if (!byKey.has(k)) byKey.set(k, site);
    }
  }
  return [...byKey.values()];
}

const key = (s) => `${s.file} :: ${s.name}`;

/** Every LIVE path literal in the file that either climbs out of the directory it
 *  is written in (`'..'`, `'../x'`) or names a declared submodule. This is the
 *  STRUCTURAL evidence for "the missing thing is not content of this repo";
 *  prose in a comment is not, which is why the mask is consulted first.
 *
 *  Deliberately NOT resolved against a base directory. The base differs per call
 *  site — `join(REPO_ROOT, '..')` and `new URL('../x', import.meta.url)` mean two
 *  different directories for the same literal — and a guard that guesses wrong
 *  about which one applies would reject a correct skip. What is checkable without
 *  guessing is that the path leaves the directory it is written in at all. */
function outwardLookups(site) {
  const out = [];
  const LITERAL = /(['"`])([^'"`\n]*)\1/g;
  for (const m of site.src.matchAll(LITERAL)) {
    const at = m.index + 1;                       // the literal's TEXT, not its quote
    if (site.mask[at] !== 's' && site.mask[at] !== 't') continue;
    const value = m[2];
    if (/^\.\.(\/|$)/.test(value)) { out.push(value); continue; }
    if (SUBMODULE_PATHS.some((sm) => value === sm || value.startsWith(`${sm}/`))) out.push(value);
  }
  return out;
}

test('every test that may skip is NAMED — the budget is a reviewed list, not a free number', () => {
  assert.deepEqual(
    skipSites().map(key).sort(),
    ALLOWED_SKIPS.map(key).sort(),
    'the set of tests that can skip changed. A skip is only excusable when its cause lives ' +
      'OUTSIDE this repo (a sibling @neomodul checkout, a submodule, a capability of the box, ' +
      'an optional npm package). If that is the case here, add the test to ALLOWED_SKIPS with ' +
      'its kind and reason and adjust --max-skipped in package.json in the SAME diff. If the ' +
      'cause lives inside this repo, the skip is hiding a gap — remove it instead.',
  );
});

test('--max-skipped is DERIVED from the list — the ceiling cannot run ahead of it', () => {
  const expected = ALLOWED_SKIPS.reduce((n, s) => n + BUDGET_BY_KIND[s.kind], 0);
  assert.equal(
    declaredCeiling,
    expected,
    `package.json declares --max-skipped ${declaredCeiling}, but the ${ALLOWED_SKIPS.length} named ` +
      `skip(s) above add up to ${expected}. A ceiling above the list is spare room the next skip ` +
      'takes without a review; a ceiling below it is a gate no green run can pass — that is exactly ' +
      'how design-studio spent 2026-08-02 unmergeable.',
  );
});

test('every named skip declares a kind this file knows how to price', () => {
  for (const entry of ALLOWED_SKIPS) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(BUDGET_BY_KIND, entry.kind),
      `${key(entry)} declares kind ${JSON.stringify(entry.kind)}; known kinds: ${Object.keys(BUDGET_BY_KIND).join(', ')}.`,
    );
    assert.ok(
      typeof entry.why === 'string' && entry.why.length >= 20,
      `${key(entry)} gives no usable reason. "why" is what the next reader has instead of this run.`,
    );
  }
});

test("each 'sibling' skip looks OUTSIDE this repo on the filesystem — never at a repo fact", () => {
  for (const entry of ALLOWED_SKIPS.filter((e) => e.kind === 'sibling')) {
    const site = skipSites().find((s) => key(s) === key(entry));
    assert.ok(site, `${key(entry)} is listed but no longer exists — drop it from ALLOWED_SKIPS.`);
    assert.match(
      site.src,
      /\b(existsSync|readdirSync|statSync)\s*\(/,
      `${key(entry)} is declared a sibling skip but ${site.file} never asks the filesystem whether ` +
        'the sibling is there. A skip that is not conditional on something absent is a permanently ' +
        'unmeasured test wearing a green tick.',
    );
    assert.ok(
      outwardLookups(site).length > 0,
      `${key(entry)} is declared a sibling skip, but no live path literal in ${site.file} leaves the ` +
        `directory it is written in or names a submodule` +
        `${SUBMODULE_PATHS.length ? ` (declared submodules: ${SUBMODULE_PATHS.join(', ')})` : ''}. ` +
        'Then the missing thing is a REPO fact, and the honest repair is to fix what is missing, ' +
        'not to skip past it.',
    );
  }
});

test('each named skip SAYS why — an argument-less skip tells the next reader nothing', () => {
  for (const site of skipSites()) {
    assert.doesNotMatch(
      site.call,
      /\(\s*\)/,
      `${key(site)} calls skip with no reason. The runner prints that reason next to the "# SKIP" ` +
        'marker; without it the log shows a test that neither passed nor failed and no way to tell why.',
    );
  }
});

// ---- THE CENSUS ONLY SEES ONE SKIP FORM — SO THAT MUST BE THE ONLY ONE ------
// MEASURED, not assumed (2026-08-02, BÜNDEL BT, against table-views origin/develop
// 1edbc58, fresh clone, nothing installed). The census above keys on `t.skip(`,
// the context-object form. node:test has two further ways to skip a test, and
// BOTH raise the runtime skip counter while leaving the list above untouched:
//
//     test('x', { skip: 'why' }, () => {});   -> 109 tests / 2 skipped / EXIT 0
//     test.skip('x', () => {});               -> 109 tests / 2 skipped / EXIT 0
//
// Both were let through against a declared ceiling of 1, in a repo that already
// carried the reviewed list — because the numeric ceiling is only enforced on an
// installed tree and the census never looked for these spellings. Two guards,
// one blind spot each, lining up exactly.
//
// Widening the census to parse them is the worse repair: `{ skip: … }` may be
// computed (`{ skip: !hasThing && 'why' }`), so a parser would have to decide at
// read time what only the run knows. The cheaper and stricter rule is a
// CONVENTION — in this repo a test skips through the context object or not at
// all — and that IS checkable in the committed source, in every layout, with
// nothing installed. A skip written any other way is refused here with the
// spelling that the census can see.
//
// Read on the masked source for the same reason as the census: this file names
// all three forms in its own prose, and a raw grep would report itself.
const FOREIGN_SKIP_FORMS = [
  {
    re: /\b(?:test|it|describe|suite)\s*\.\s*skip\s*\(/g,
    what: 'the METHOD form (test.skip(…) / it.skip(…) / describe.skip(…))',
  },
  {
    re: /[{,]\s*skip\s*:/g,
    what: 'the OPTIONS form ({ skip: … } as the second argument of test())',
  },
];

test('a test skips through the context object or not at all — no form the census cannot see', () => {
  const found = [];
  for (const file of unitSuites) {
    const src = readFileSync(join(REPO_ROOT, file), 'utf8');
    const mask = maskOf(src);
    for (const form of FOREIGN_SKIP_FORMS) {
      for (const m of src.matchAll(form.re)) {
        if (mask[m.index] !== 'c') continue;      // prose, string or regex literal is not code
        found.push(`${file}: ${form.what} — ${src.slice(m.index, src.indexOf('\n', m.index)).trim()}`);
      }
    }
  }
  assert.deepEqual(
    found,
    [],
    'these skips are written in a form the ALLOWED_SKIPS census above cannot see, so they raise ' +
      'the runtime skip count with no entry on the reviewed list and no diff to review:\n  ' +
      found.join('\n  ') +
      '\n  Rewrite them as the context form, which the census does see:\n' +
      "      test('…', (t) => { if (<absent>) { t.skip('<why>'); return; } … });\n" +
      '  and add the test to ALLOWED_SKIPS with its kind and reason in the same diff.',
  );
});
