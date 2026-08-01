// test/strip-comments-census.test.mjs
// -----------------------------------------------------------------------------
// ZWANGSPUNKT fuer die stripComments-Klasse ([[waechter-brauchen-einen-zwangspunkt]]).
//
// Fast jeder Quelltext-Waechter in diesem Repo traegt eine eigene, handgeschriebene
// Kommentar-Entferner-Kette. Sie kann auf DREI Arten falsch sein:
//
//   BLIND         `//` in `https://` liest sich als Kommentarbeginn -> der Rest der
//                 Zeile wird gefressen, der Waechter prueft still NICHTS und meldet
//                 GRUEN. Die schlimmste Richtung: ein falsch roter Waechter nervt,
//                 ein falsch gruener wird geglaubt.
//   UNTERSTRIPPT  nur ganze Kommentarzeilen werden entfernt -> ein AUSKOMMENTIERTER
//                 Verstoss hinter Code zaehlt als echter, der Waechter meldet ROT.
//   UEBERSTRIPPT  die Kette frisst lebenden Code mit (gieriges `[\s\S]*` statt
//                 `[\s\S]*?`, oder ein Zeilenstripper, der bis Dateiende loescht).
//
// Die Klasse ist am 2026-08-01 ueber alle 11 Repos ausgefuehrt gemessen worden
// (545 Ketten, 0 Defekte). Sauber ist sie damit — GESICHERT erst durch diese
// Datei: ohne Zwangspunkt zerfaellt ein Waechter, und genau so ist diese Klasse
// schon zweimal zurueckgekommen.
//
// Diese Datei laeuft IMMER und haengt an KEINER Installation: sie liest nur
// Quelltext. Ohne `esbuild` bleiben Ketten mit TS-Annotationen unmessbar — dafuer
// gibt es die eigene, ebenfalls immer laufende Schranke unten.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractChains, classify, hasCommentForm } from './lib/strip-census.mjs';

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const EXT = /\.(m|c)?[jt]sx?$/;
const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.git)(\/|$)/;

function trackedFiles() {
  // Bewusst KEIN `grep -l` zur Dateiauswahl: grep stuft Dateien mit
  // ungewoehnlichen Bytes als BINAER ein und laesst sie lautlos aus der Auswahl
  // fallen ([[bundle-grep-luegt-bei-umlauten]]). `git ls-files` kennt diesen
  // Fehlmodus nicht.
  return execFileSync('git', ['ls-files', '-z'], { cwd: REPO, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0')
    .filter((f) => f && EXT.test(f) && !SKIP.test(f));
}

function census() {
  const rows = [];
  for (const f of trackedFiles()) {
    let src;
    try { src = readFileSync(join(REPO, f), 'utf8'); } catch { continue; }
    if (!src.includes('.replace')) continue;
    for (const ch of extractChains(src)) {
      rows.push({ file: f, line: ch.line, text: ch.text, ...classify(ch.text) });
    }
  }
  return rows;
}

const ROWS = census();
const REMOVER_VERDICTS = ['KORREKT', 'BLIND', 'UNTERSTRIPPT', 'UEBERSTRIPPT', 'BLOCKONLY'];
const REMOVERS = ROWS.filter((r) => REMOVER_VERDICTS.includes(r.verdict));
const show = (r) => `${r.file}:${r.line}\n      ${r.text.replace(/\s+/g, ' ').slice(0, 200)}`;

// Jeder Waechter druckt die ANZAHL des Geprueften — sonst ist "gruen" nicht von
// "hat nichts angesehen" zu unterscheiden.
{
  const counts = {};
  for (const r of ROWS) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  console.error(`strip-census: ${ROWS.length} Kette(n) in ${trackedFiles().length} verfolgten Datei(en), `
    + `davon ${REMOVERS.length} Kommentar-Entferner — `
    + Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join(' '));
}

// --- Der eigentliche Zwangspunkt --------------------------------------------

test('kein Kommentar-Entferner in diesem Repo ist BLIND (frisst die URL-Zeile)', () => {
  const bad = ROWS.filter((r) => r.verdict === 'BLIND');
  assert.deepEqual(bad.map(show), [],
    'Ein blinder Stripper meldet GRUEN, ohne etwas geprueft zu haben. Hausfassung:\n'
    + "  src.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/(^|[^:])\\/\\/[^\\n]*/g, '$1')");
});

test('kein Kommentar-Entferner in diesem Repo ist UNTERSTRIPPT', () => {
  const bad = ROWS.filter((r) => r.verdict === 'UNTERSTRIPPT');
  assert.deepEqual(bad.map(show), [],
    'Ein ^\\s*//-Stripper laesst Trailing-Kommentare stehen: ein auskommentierter '
    + 'Verstoss zaehlt dann als echter und der Waechter meldet falsch ROT.');
});

test('kein Kommentar-Entferner in diesem Repo ist UEBERSTRIPPT', () => {
  const bad = ROWS.filter((r) => r.verdict === 'UEBERSTRIPPT');
  assert.deepEqual(bad.map(show), [],
    'Die Kette frisst lebenden Code mit — der Waechter sieht den Teil der Datei '
    + 'nie, der hinter dem verschluckten Stueck steht.');
});

// --- Schranke gegen das leere gruene Gate ------------------------------------
// Eine Kette ohne ausgefuehrtes Urteil ist keine gemessene Kette. Das Ziel ist
// NICHT 'null unmessbare Ketten' — manche lassen sich ohne Uebersetzer nicht
// ausfuehren. Das Ziel ist, dass keine unmessbare Kette KOMMENTAR-FORM traegt,
// denn nur die koennte ein defekter Stripper sein.
test('keine unmessbare Kette traegt Kommentar-Form', () => {
  const blind = ROWS.filter((r) => r.verdict === 'UNMESSBAR' && hasCommentForm(r.text));
  assert.deepEqual(blind.map((r) => `${show(r)}\n      Grund: ${r.reason}`), [],
    'Diese Ketten konnten nicht ausgefuehrt werden und sehen zugleich wie ein '
    + 'Kommentar-Entferner aus. Ueber sie liegt nur ein GELESENES Urteil vor, '
    + 'und genau diese Messform ist die Ursuende dieser Klasse.');
});

// --- Der Waechter prueft sich selbst -----------------------------------------
// Ein Pruefwerkzeug ohne eigene Pruefung ist nur eine weitere unbelegte
// Behauptung. Faellt dieser Test aus, sind die Tests oben WERTLOS, auch wenn sie
// gruen sind — dann urteilt der Zensus nicht mehr, er schweigt nur.
test('der Zensus selbst urteilt noch richtig (Selbsttest)', () => {
  const FIXTURES = [
    [`.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/(^|[^:])\\/\\/[^\\n]*/g, '$1')`, 'KORREKT'],
    [`.replace(/^([^\\n]*?)(?<!:)\\/\\/.*$/gm, '$1')`, 'KORREKT'],
    [`.replace(/\\/\\/.*|\\/\\*[\\s\\S]*?\\*\\//g, '')`, 'BLIND'],
    [`.replace(/\\/\\/[^\\n]*/g, '')`, 'BLIND'],
    [`.replace(/^\\s*\\/\\/.*$/gm, '')`, 'UNTERSTRIPPT'],
    [`.replace(/\\/\\*[\\s\\S]*\\*\\//g, '')`, 'UEBERSTRIPPT'],
    [`.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')`, 'BLOCKONLY'],
    [`.replace(/\\s+/g, ' ')`, 'KEIN_ENTFERNER'],
    [`.replace(/<!--[\\s\\S]*?-->/g, '')`, 'KEIN_ENTFERNER'],
    // Textschnitte sind KEINE Kommentar-Entferner (Kontrollsonden):
    [`.replace(/^(.+\\n){1,3}/, 'x')`, 'KEIN_ENTFERNER'],
    [`.replace(/^[\\s\\S]*?export const X = /, '').replace(/;[\\s\\S]*$/, '')`, 'KEIN_ENTFERNER'],
    // freie Bezeichner duerfen nicht werfen:
    [`.replace(ROOT + '/', '')`, 'KEIN_ENTFERNER'],
    [`.replace(absUrl(fileUrl))`, 'KEIN_ENTFERNER'],
    [`.replace('{lat}', lat.toFixed(6))`, 'KEIN_ENTFERNER'],
  ];
  for (const [chain, want] of FIXTURES) {
    assert.equal(classify(chain).verdict, want, `Fehlurteil ueber: ${chain}`);
  }
  console.error(`strip-census Selbsttest: ${FIXTURES.length} Fixture(s) richtig beurteilt.`);
});

test('der Extraktor liest weder Kommentare noch Strings als Code', () => {
  // Negativkontrolle: ein Stripper, der nur BESCHRIEBEN ist, ist kein Waechter.
  const onlyProse = [
    '// Hausfassung: src.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "")',
    '/* frueher stand hier .replace(/\\/\\/.*$/gm, "") */',
    'const doku = "s.replace(/x/g, \'y\')";',
    'const NOTHING = 1;',
  ].join('\n');
  assert.equal(extractChains(onlyProse).length, 0,
    'Ein auskommentierter oder in einem String zitierter Stripper wurde als '
    + 'lebender Waechter gezaehlt.');

  // Gegenkontrolle: OHNE sie belegt die Negativkontrolle nichts — ein Extraktor,
  // der nie etwas findet, besteht sie ebenfalls.
  const withReal = `${onlyProse}\nconst out = s.replace(/\\/\\/.*/g, '');`;
  const found = extractChains(withReal);
  assert.equal(found.length, 1, 'Der echte Stripper daneben wurde nicht gefunden.');
  assert.equal(classify(found[0].text).verdict, 'BLIND');

  // Das Kettenende muss exakt sitzen: eine ')' in einem Literal darf den
  // Klammerabgleich nicht beenden, sonst laeuft die Kette in den Folgecode.
  const tricky = `s.replace(/\\)/g, ')').replace(')', '(');`;
  const ch = extractChains(tricky);
  assert.equal(ch.length, 1);
  assert.equal(tricky[ch[0].end + 1], ';', 'Der Klammerabgleich endete an der falschen Stelle.');
});

test('hasCommentForm schlaegt bei echten Strippern an', () => {
  // Ohne diesen Test ist 'keine unmessbare Kette traegt Kommentar-Form' die
  // Aussage eines Praedikats, das vielleicht immer false liefert.
  for (const t of [`.replace(/\\/\\/.*/g, '')`, `.replace(/\\/\\*[\\s\\S]*?\\*\\//g, '')`, `.replace(/\\/\\/.*|\\/\\*[\\s\\S]`]) {
    assert.equal(hasCommentForm(t), true, `Praedikat schweigt bei: ${t}`);
  }
  for (const t of [`.replace(/\\s+/g, ' ')`, `.replace('{lat}', lat.toFixed(6))`]) {
    assert.equal(hasCommentForm(t), false, `Praedikat schlaegt faelschlich an bei: ${t}`);
  }
});

// --- Zaehlschranke gegen das leere gruene Gate -------------------------------

test('der Zensus hat ueberhaupt Ketten und Entferner gesehen', () => {
  // DIE ZAEHLSCHRANKE. Faende der Scanner nichts, waeren die vier Tests oben
  // trivial gruen — ein leeres gruenes Gate. Beide Untergrenzen stammen aus der
  // Messung DIESES Repos (2026-08-01: 12 Ketten, 2 Kommentar-Entferner)
  // und sind mit Luft nach unten gesetzt, damit ein normaler Umbau sie nicht
  // rot macht, ein blind gewordener Scanner aber schon.
  assert.ok(ROWS.length >= 8,
    `nur ${ROWS.length} Ketten gefunden (Messung 2026-08-01: 12) — der Scanner ist blind geworden`);
  assert.ok(REMOVERS.length >= 1,
    `nur ${REMOVERS.length} Kommentar-Entferner gefunden (Messung 2026-08-01: 2)`);
});
