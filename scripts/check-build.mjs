#!/usr/bin/env node
/**
 * check-build — RUNS this repo's release build, as a stage of `npm test`.
 *
 * ---- WHY THIS EXISTS (measured 2026-08-02, BÜNDEL BR / ticket f9d8a466) -------------------------
 *
 * `Dockerfile:58` of the neobase superproject builds exactly two plugins FROM SOURCE
 * (`konfigurator`, `gdrive-sync`) by running `npm install --omit=peer && npm run build`. Everything
 * else it copies. So for these two repos, `npm run build` IS the release image: if it dies, no
 * image can be produced at all.
 *
 * Nothing ran it. Measured on konfigurator's develop tip `94db080`, in a fresh clone:
 *
 *     npm test              329 tests · 329 pass · 0 fail       GREEN
 *     npm run typecheck     both tsconfigs                      GREEN
 *     node build-client.js                                      GREEN
 *     node build-embed.js   Build failed with 4 errors          RED
 *        No matching export in "src/embed/tableViewsShim.tsx" for import "fittedScrollX"
 *        No matching export in "src/embed/tableViewsShim.tsx" for import "resolveColumnLayout"
 *
 * A fully green test suite on a tree whose release image could not be built. The census that
 * followed found the class, not the instance: 11 of 11 plugin repos have a `build` script, and
 * 0 of 11 `test` scripts called it. `npm run build` hung on no forcing point whatsoever
 * ([[waechter-brauchen-einen-zwangspunkt]]: a guard nobody calls is a guard that does not exist).
 *
 * ---- WHY IT IS A STAGE OF `npm test` AND NOT A TIMER -------------------------------------------
 *
 * Measured before choosing, fresh clone, installed tree, this box:
 *
 *     konfigurator  npm run build   740 ms   (server 106 ms · client 234 ms · embed 324 ms)
 *     gdrive-sync   npm run build   170 ms
 *
 * Sub-second. Rule 1b of [[waechter-brauchen-einen-zwangspunkt]] (SPLIT the check when the full
 * one is too expensive for every `npm test`) does not need to be invoked: at this price the whole
 * build fits in the cheapest forcing point there is. That buys two triggers for free — the
 * `npm test` every merge is gated on, and `neobase-test-sweep.timer`, which every 6 h clones all
 * eleven repos and runs their `npm test` WITH `--install`, i.e. on an installed tree where this
 * stage really builds.
 *
 * ---- WHAT IT REFUSES TO DO --------------------------------------------------------------------
 *
 *  1. It does not keep a LIST of build steps. The steps are DERIVED from `package.json`'s
 *     `scripts.build` — the very string `npm run build`, and therefore the Dockerfile, executes.
 *     Three times now this repo family has been bitten by a hand-kept list of "which plugins /
 *     which steps" drifting from the thing it described (see DIST_SHIPPING_PLUGINS in sandbox.sh:
 *     "THE LESSON, third time now: it must be DERIVED, not kept by hand").
 *  2. It refuses over an EMPTY SELECTION. Zero derived steps is exit 1, never a green "ok".
 *  3. It refuses an UNWIRED build script: every `build-*.js` in the repo root must appear in
 *     `scripts.build`. Adding `build-worker.js` and forgetting to chain it would otherwise produce
 *     a build step that this gate, `npm run build` and the Dockerfile all silently skip.
 *  4. It refuses a step that exits 0 while producing NO artefact. "Exit 0" is not evidence
 *     ([[optionale-abhaengigkeiten-in-tests]]: a count, or it did not happen).
 *  5. It PRINTS what it checked — repo, every step, its milliseconds, its exit code, the number of
 *     artefacts it wrote, and the totals. A guard that only says "ok" has twice on this board run
 *     green over an empty selection.
 *
 * ---- THE WORKING TREE IS NEVER TOUCHED --------------------------------------------------------
 *
 * The build runs in a scratch directory under `node_modules/.cache/` whose top-level entries are
 * symlinks back to the real repo, except `dist/`, which is a fresh empty directory of its own, and
 * the `build-*.js` files, which are real copies (Node resolves a symlinked script to its realpath,
 * so a symlinked build script would compute `pluginDir` = the real repo and write into the real
 * `dist/`). Two reasons this matters, both recorded incidents:
 *
 *   - konfigurator's `build-embed.js` starts three esbuild jobs side by side. When the first dies
 *     the other two still write their files, leaving a HALF-BUILT `dist/embed/`; a later
 *     `./sandbox.sh up` sees a non-empty directory, skips the bootstrap and exits 0 with
 *     `configurator.js` still missing (pitfall 1 of [[konfigurator-embed-bundle-und-shim]]).
 *     A test stage must not be able to manufacture that state.
 *   - gdrive-sync COMMITS its `dist/`. Building into it would leave `npm test` dirtying the tree.
 *
 * ---- SKIPPING IS ONLY EXCUSABLE WHEN THE TOOLCHAIN IS ABSENT ----------------------------------
 *
 * Same discriminator as `scripts/run-unit-tests.mjs`, and for the same house norm (Ben, 2026-08-01):
 * a red `npm test` must always mean a real defect, never merely a missing installation.
 *
 *   toolchain NOT installed -> the build cannot run. Say NOT MEASURED, loudly, and exit 0. The
 *                              repo-property half above (1-3) still runs and can still fail.
 *   toolchain IS installed  -> "not installed" is no longer an available excuse. Build, or be red.
 *
 * A DECLARED-BUT-UNCHECKED-OUT GIT SUBMODULE IS THE SAME KIND OF ABSENCE, and it took a measurement
 * to see it. konfigurator's `src/embed/tableViewsShim.tsx` re-exports from
 * `../../table-views/src/client/components/columnLayout`, i.e. across the nested `table-views`
 * submodule. Measured in a NON-recursive clone (which is exactly how `./sandbox.sh test-sweep`
 * clones, and how `git clone` behaves by default):
 *
 *     [3/3] node build-embed.js  rc=1
 *        Could not resolve "../../table-views/src/client/components/columnLayout"
 *
 * That is a missing checkout, not a defect, and turning it into a red `npm test` would break the
 * house norm in the direction that trains people to ignore red. The submodule list is read from
 * `.gitmodules` — derived, never hand-kept — and a repo without one (gdrive-sync) is unaffected.
 * The release path always has them: the neobase Dockerfile COPYs the superproject's checked-out
 * submodule trees, so `npm run build` there never sees this state.
 *
 * This file is deliberately generic: it is byte-identical in konfigurator and gdrive-sync and must
 * stay so. Do not add repo-specific names to it — derive them, as everything here is derived.
 */

import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync, symlinkSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_NAME = (() => {
  try { return JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')).name || REPO_ROOT; }
  catch { return REPO_ROOT; }
})();

const say = (s = '') => console.error(s);
const die = (headline, body) => {
  say('');
  say(`check-build: ${headline}`);
  if (body) say(body);
  say('');
  process.exit(1);
};

// ---- half A: repo properties. Runs on every tree, installed or not. ---------------------------

let pkg;
try { pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')); }
catch (e) { die('CANNOT READ package.json — nothing can be derived.', `  ${e.message}`); }

const buildScript = pkg?.scripts?.build;
if (typeof buildScript !== 'string' || buildScript.trim() === '') {
  die('NO `scripts.build` — EMPTY SELECTION.',
    '  The Dockerfile builds this repo from source with `npm run build`. A repo that reaches this\n' +
    '  gate must have one, and this gate must never report green over zero build steps.');
}

// `node a.js && node b.js` -> ['a.js', 'b.js']. Anything that is not exactly `node <file>.js` is
// refused rather than skipped: a step this gate cannot recognise is a step it cannot claim to have
// checked, and silently dropping it is the empty-selection defect one level down.
const steps = [];
for (const raw of buildScript.split('&&')) {
  const seg = raw.trim();
  if (seg === '') continue;
  const m = /^node\s+(?:\.\/)?([\w./-]+\.(?:js|mjs|cjs))$/.exec(seg);
  if (!m) {
    die(`UNRECOGNISED BUILD STEP — cannot verify \`${seg}\`.`,
      `  scripts.build = ${buildScript}\n` +
      '  This gate only knows how to run `node <file>` steps. Teach it the new shape rather than\n' +
      '  letting it report green over a step it never executed.');
  }
  steps.push(m[1]);
}
if (steps.length === 0) {
  die('EMPTY SELECTION — `scripts.build` derived 0 build steps.', `  scripts.build = ${buildScript}`);
}

const missing = steps.filter((s) => !existsSync(join(REPO_ROOT, s)));
if (missing.length) {
  die(`MISSING BUILD SCRIPT — ${missing.length} step(s) named by scripts.build do not exist.`,
    missing.map((s) => `    ${s}`).join('\n') + '\n  `npm run build` — and therefore the release image — cannot work in this tree.');
}

// Every build-*.js lying in the repo root must be wired into scripts.build. This is the guard
// against the hand-kept list: a new build step that nobody chained is a build step that ships
// unbuilt, and it looks exactly like nothing at all.
const rootBuildFiles = readdirSync(REPO_ROOT).filter((f) => /^build-.*\.(js|mjs|cjs)$/.test(f)).sort();
const unwired = rootBuildFiles.filter((f) => !steps.includes(f));
if (unwired.length) {
  die(`UNWIRED BUILD SCRIPT — ${unwired.length} file(s) in the repo root are not in scripts.build.`,
    unwired.map((f) => `    ${f}`).join('\n') +
    `\n  scripts.build = ${buildScript}\n` +
    '  Chain it, or delete it. A build script nothing runs is not a build step, it is a decoy.');
}

say(`check-build: ${REPO_NAME}`);
say(`  scripts.build      ${buildScript}`);
say(`  derived steps      ${steps.length} · ${steps.join(', ')}`);
say(`  root build-*.js    ${rootBuildFiles.length} on disk · ${rootBuildFiles.length - unwired.length} wired · 0 unwired`);

// ---- the toolchain discriminator ---------------------------------------------------------------
// "Installed" is a POPULATED node_modules, never merely a present one: in the shared main checkout
// every plugin's node_modules is an empty root-owned docker mountpoint (same reasoning, and the
// same code, as scripts/run-unit-tests.mjs).
const nodeModules = join(REPO_ROOT, 'node_modules');
let installed = false;
try { installed = existsSync(nodeModules) && readdirSync(nodeModules).length > 0; } catch { installed = false; }

// Declared git submodules must actually be checked out: this repo's sources may import ACROSS one
// (see the header), and an absent one is a missing checkout, not a defect. Derived from
// .gitmodules, never a hand-kept list. "Checked out" = a POPULATED directory, for the same reason
// node_modules is measured that way: `git clone` leaves an empty placeholder directory behind.
const declaredSubs = (() => {
  const f = join(REPO_ROOT, '.gitmodules');
  if (!existsSync(f)) return [];
  try { return [...readFileSync(f, 'utf8').matchAll(/^\s*path\s*=\s*(.+?)\s*$/gm)].map((m) => m[1]); }
  catch { return []; }
})();
const absentSubs = declaredSubs.filter((p) => {
  try { return readdirSync(join(REPO_ROOT, p)).length === 0; } catch { return true; }
});
if (declaredSubs.length) {
  say(`  submodules         ${declaredSubs.length} declared · ${declaredSubs.length - absentSubs.length} checked out` +
      (absentSubs.length ? ` · ABSENT: ${absentSubs.join(', ')}` : ''));
}

if (!installed || absentSubs.length) {
  const why = !installed
    ? 'node_modules is empty or absent — esbuild is a devDependency, so the build cannot run at all.'
    : `these declared submodules are not checked out: ${absentSubs.join(', ')} — sources import across them.`;
  const fix = !installed
    ? 'npm install --omit=peer && npm test'
    : `git submodule update --init ${absentSubs.join(' ')} && npm test`;
  say(`  toolchain          ${installed ? 'installed' : 'NOT installed'}`);
  say('');
  say(`check-build: NOT MEASURED — ${steps.length} build step(s) derived and present, 0 EXECUTED.`);
  say(`  ${why}\n` +
      '  That is an environment gap, not a defect, and it is not turned into a red `npm test`.\n' +
      '  It IS measured on every complete tree, and unattended every 6 h by\n' +
      '  `neobase-test-sweep.timer`, which clones this repo and runs `npm test` WITH --install.\n' +
      `  To measure it here:  ${fix}`);
  say('');
  process.exit(0);
}
say(`  toolchain          installed`);

// ---- half B: run the build, in a scratch tree that cannot touch dist/ --------------------------

const countFiles = (dir) => {
  let n = 0, bytes = 0;
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) { n += 1; try { bytes += statSync(p).size; } catch { /* raced */ } }
    }
  };
  walk(dir);
  return { n, bytes };
};

const scratch = join(nodeModules, '.cache', 'neomodul-build-gate', `run-${process.pid}`);
let exitCode = 0;
try {
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  for (const entry of readdirSync(REPO_ROOT)) {
    if (entry === 'dist' || entry === '.git' || steps.includes(entry)) continue;
    symlinkSync(join(REPO_ROOT, entry), join(scratch, entry));
  }
  for (const s of steps) {
    // A real copy, not a symlink: Node resolves a script to its realpath, so a symlinked
    // build-*.js would compute its plugin directory as the REAL repo and write into the real dist/.
    mkdirSync(dirname(join(scratch, s)), { recursive: true });
    copyFileSync(join(REPO_ROOT, s), join(scratch, s));
  }
  mkdirSync(join(scratch, 'dist'), { recursive: true });
  say(`  scratch            ${relative(REPO_ROOT, scratch)}  (the real dist/ is never written)`);
  say('');

  let ran = 0, failed = 0, artefacts = 0, totalMs = 0, esbuildErrors = 0;
  for (const [i, s] of steps.entries()) {
    const before = countFiles(join(scratch, 'dist')).n;
    const t0 = process.hrtime.bigint();
    const r = spawnSync(process.execPath, [s], { cwd: scratch, encoding: 'utf8', env: { ...process.env } });
    const ms = Number((process.hrtime.bigint() - t0) / 1000000n);
    const out = `${r.stdout || ''}${r.stderr || ''}`;
    const after = countFiles(join(scratch, 'dist'));
    const produced = after.n - before;
    const rc = r.status === null ? `signal ${r.signal}` : r.status;
    ran += 1; totalMs += ms; artefacts += Math.max(0, produced);
    const errs = (out.match(/^\s*(?:✘|X) \[ERROR\]/gm) || []).length;
    esbuildErrors += errs;

    const ok = r.status === 0 && produced > 0;
    say(`  [${i + 1}/${steps.length}] node ${s.padEnd(18)} rc=${String(rc).padEnd(3)} ${String(ms).padStart(5)} ms  ${String(produced).padStart(3)} artefact(s)  ${ok ? 'OK' : 'FAILED'}`);

    if (r.status !== 0) {
      failed += 1;
      say(`      ${errs} esbuild error(s) — output of the failing step:`);
      const tail = out.split('\n').filter((l) => l.trim() !== '').slice(-24);
      for (const l of tail) say(`      | ${l}`);
    } else if (produced === 0) {
      failed += 1;
      say('      exit 0 but the step wrote NOTHING into dist/. A build that produces no artefact');
      say('      has not built anything; exit 0 alone is not evidence that it did.');
      const tail = out.split('\n').filter((l) => l.trim() !== '').slice(-10);
      for (const l of tail) say(`      | ${l}`);
    }
  }

  say('');
  const totals =
    `${ran} build step(s) EXECUTED · ${ran - failed} ok · ${failed} failed · ` +
    `${artefacts} artefact(s) (${(countFiles(join(scratch, 'dist')).bytes / 1024).toFixed(0)} kB) · ` +
    `${esbuildErrors} esbuild error(s) · ${totalMs} ms`;
  if (failed > 0) {
    say(`check-build: BUILD FAILED — ${totals}`);
    say('');
    say(`  \`npm run build\` is what the neobase Dockerfile runs for this repo. While this is red the`);
    say('  release image cannot be built, no matter how green the rest of the suite is.');
    say(`  Reproduce:  cd ${REPO_ROOT} && npm run build`);
    say('');
    exitCode = 1;
  } else {
    say(`check-build: OK — ${totals}`);
    say('');
  }
} catch (e) {
  say('');
  say(`check-build: COULD NOT MEASURE — the gate itself failed: ${e && e.message}`);
  say('  This is not an all-clear. Treat it as red until the gate runs again.');
  say('');
  exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
process.exit(exitCode);
