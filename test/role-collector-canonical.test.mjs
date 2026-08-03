// test/role-collector-canonical.test.mjs
// -----------------------------------------------------------------------------------------------
// DER ROLLEN-SAMMLER DRIFTET NICHT MEHR — UND DAS WIRD GEZAEHLT, NICHT GEMUSTERT.
//
// Diese Datei ist in NEUN Plugin-Repos zeichengleich (konfigurator, crm, pdf-generator,
// design-studio, neoai, unified-search, cloudflare, saved-filters, table-views). Sie haelt EINE
// Invariante: die Frage "welche Rollen traegt dieser Aufruf?" wird im Serverbaum an genau EINER
// Stelle beantwortet, und diese Stelle ist ueber alle neun Repos hinweg zeichengleich.
//
// ---- WARUM ES DIESEN WAECHTER GIBT ------------------------------------------------------------
//
// Vor 2026-08-03 gab es ueber neun Repos hinweg VIER Bauarten desselben Sammlers an ~17 Stellen.
// Vier Plugins kannten das Pseudo `__union__` nicht einmal. Kein Leck war daraus ableitbar — aber
// es ist genau die Bauform, bei der eine spaeter gefundene Luecke neunmal repariert werden muss
// und beim zehnten Plugin wieder hereinkommt. Der Kommentar im kanonischen Block benennt den
// Mechanismus selbst.
//
// ---- WARUM ZAEHLEN UND NICHT MUSTERN (die Falle, die dieses Haus schon bezahlt hat) ------------
//
// Ein `assert.match` auf eine Schreibweise ist KEIN Waechter. In BUENDEL CQ stand derselbe
// ACL-Riegel ZWEIMAL zeichengleich im Code, und eine Zusicherung per `assert.match` blieb GRUEN,
// waehrend eine der beiden Fundstellen aufgeweicht war — der Regex fand die andere und war
// zufrieden. Dieser Waechter zaehlt daher jede Fundstelle, druckt die Anzahl, und vergleicht
// jeden gefundenen Block ZEICHENWEISE gegen eine Pruefsumme.
//
// ---- DIE VIER ZUSICHERUNGEN -------------------------------------------------------------------
//
//   A  Es sind ueberhaupt Dateien geprueft worden. Ein Waechter, der ueber NULL Dateien laeuft und
//      gruen meldet, ist in diesem Projekt der Regelfall gewesen (siehe `run-unit-tests.mjs`:
//      ein Glob, der nichts trifft, laeuft null Tests und endet mit 0). Hier ist er ROT.
//   B  Genau EIN kanonischer Block liegt im Serverbaum. Null = der Sammler ist verschwunden oder
//      umbenannt; zwei = jemand hat eine zweite Kopie angelegt, und ab da driften sie.
//   C  Der Block ist zeichengleich zu CANONICAL_SHA256 — derselben Konstante in allen neun Repos.
//      `./sandbox.sh role-collector` im neobase-Superprojekt vergleicht sie ueber die Repos hinweg.
//   D  Kein zweiter Sammler: jede Code-Lesestelle von `state.currentRole(s)` im Serverbaum liegt
//      INNERHALB des kanonischen Blocks — oder traegt eine ausdrueckliche, begruendete Ausnahme.
//
// ---- WAS DIESE DATEI IST UND WAS NICHT ---------------------------------------------------------
//
// Sie liest die COMMITTETE QUELLE, nicht die Laufzeit — dieselbe bewusste Wahl wie
// `acl-owner-scope.test.mjs`: auf einem frischen Klon ist nichts installiert, und eine Pruefung,
// die einen gebauten Server braeuchte, wuerde dort ehrlich ueberspringen und damit genau in der
// Lage schweigen, in der sie gebraucht wird. Sie belegt, dass EINE Fassung im Code STEHT — nicht,
// wie sie sich zur Laufzeit verhaelt. Letzteres pruefen die Verhaltenstests der Repos, die den
// Sammler direkt aufrufen koennen (pdf-generator, neoai, konfigurator).
//
// ---- NEGATIVKONTROLLE, DAUERHAFT ---------------------------------------------------------------
//
// `NEOBASE_ROLE_COLLECTOR_SCAN_ROOT=<leeres verzeichnis> node --test test/role-collector-canonical.test.mjs`
// muss ROT werden (Zusicherung A). Das ist die Probe gegen das leere Gruen und laesst sich ohne
// Codeaenderung jederzeit wiederholen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOT = process.env.NEOBASE_ROLE_COLLECTOR_SCAN_ROOT || join(REPO_ROOT, 'src', 'server');

/** Anfang und Ende des kanonischen Blocks. Praefix-Vergleich auf der getrimmten Zeile, damit
 *  Einrueckung keine Rolle spielt — der Block selbst steht immer auf Spalte 0. */
const BEGIN_MARKER = '// ── ROLLEN-SAMMLER · KANONISCH v1';
const END_MARKER = '// ── ENDE ROLLEN-SAMMLER · KANONISCH v1';

/** Die Pruefsumme des kanonischen Blocks, identisch in allen neun Repos. Wer sie hier aendert,
 *  muss sie in allen neun aendern — `./sandbox.sh role-collector` vergleicht sie repo-uebergreifend. */
const CANONICAL_SHA256 = '18598d87d3ccae40c5d6ca35999b3b900bfd448c9cd5d9d78d94ac2a86c640ca';

/** Der Ausnahme-Marker. Eine Lesestelle, die eine ANDERE Frage stellt als "welche Rollen traegt
 *  dieser Aufruf" (z.B. der rohe `X-Role`-Header in einer allowManager-Bedingung, die laut
 *  Projektgedaechtnis LAEUFT, BEVOR NocoBase den Token nach `ctx.state` aufloest), traegt diesen
 *  Marker mit Begruendung in einem Kommentar innerhalb der sechs Zeilen darueber. Ausnahmen werden
 *  GEZAEHLT UND GEDRUCKT, nie stillschweigend geschluckt. */
const EXEMPTION_MARKER = 'ROLLEN-SAMMLER-AUSNAHME';
const EXEMPTION_LOOKBACK = 6;

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // `__tests__` gehoert dem jeweiligen Repo: dort STEHEN Rollen-Gestalten absichtlich als
      // Eingabedaten, und sie zu verbieten hiesse, die Verhaltenstests des Sammlers zu verbieten.
      if (entry === '__tests__' || entry === 'node_modules') continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Zeilen ohne `//`- und Block-Kommentare, in der HAUSFASSUNG des `strip-census`.
 *
 *  ⚠️ `.replace(/\/\/.*$/, '')` waere BLIND: es frisst jede Zeile ab dem `//` einer `https://`-URL
 *  und meldet damit gruen, ohne den Rest der Zeile je gesehen zu haben. Genau diese Klasse zaehlt
 *  `test/strip-comments-census.test.mjs` in allen neun Repos ab, und sie hat diese Datei bei ihrer
 *  Einfuehrung auch prompt erwischt. Die `(^|[^:])`-Form ueberspringt das `://` einer URL.
 *
 *  Der Block-Kommentar wird durch LEERZEICHEN ersetzt statt geloescht, damit die Zeilennummern
 *  erhalten bleiben — eine gemeldete Fundstelle muss auf die echte Zeile zeigen. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .split('\n');
}

const files = walk(SCAN_ROOT);

/** Jeder kanonische Block im Baum, mit Datei, Zeilenbereich und Pruefsumme. */
const blocks = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith(BEGIN_MARKER)) continue;
    let end = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (lines[j].trim().startsWith(END_MARKER)) { end = j; break; }
    }
    const text = end === -1 ? null : `${lines.slice(i, end + 1).join('\n')}\n`;
    blocks.push({
      file: relative(REPO_ROOT, file),
      from: i + 1,
      to: end === -1 ? null : end + 1,
      sha256: text === null ? null : createHash('sha256').update(text, 'utf8').digest('hex'),
      closed: end !== -1,
    });
    if (end !== -1) i = end;
  }
}

/** Jede Code-Lesestelle des aktiven Rollenzustands, mit der Angabe, ob sie im kanonischen Block
 *  liegt und ob sie eine ausdrueckliche Ausnahme traegt. */
const READ_PATTERN = /state\s*\??\.\s*\[?['"`]?currentRoles?\b/;
const reads = [];
for (const file of files) {
  const raw = readFileSync(file, 'utf8').split('\n');
  const code = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(REPO_ROOT, file);
  const inBlock = blocks.filter((b) => b.file === rel && b.closed);
  for (let i = 0; i < code.length; i += 1) {
    if (!READ_PATTERN.test(code[i])) continue;
    const lineNo = i + 1;
    const covered = inBlock.some((b) => lineNo >= b.from && lineNo <= b.to);
    const lookback = raw.slice(Math.max(0, i - EXEMPTION_LOOKBACK), i + 1).join('\n');
    reads.push({
      file: rel,
      line: lineNo,
      text: code[i].trim().slice(0, 100),
      covered,
      exempt: lookback.includes(EXEMPTION_MARKER),
    });
  }
}

const outside = reads.filter((r) => !r.covered && !r.exempt);
const exempted = reads.filter((r) => !r.covered && r.exempt);

test('Rollen-Sammler: der Waechter hat ueberhaupt etwas geprueft (A)', () => {
  console.log(
    `[rollen-sammler] geprueft: ${files.length} Datei(en) unter ${relative(REPO_ROOT, SCAN_ROOT) || SCAN_ROOT} · ` +
      `${blocks.length} kanonische(r) Block/Bloecke · ${reads.length} Lesestelle(n) ` +
      `(${reads.length - outside.length - exempted.length} im Block, ${exempted.length} Ausnahme(n), ${outside.length} offen)`,
  );
  assert.ok(
    files.length > 0,
    `Der Waechter hat NULL Dateien gesehen (${SCAN_ROOT}). Ein Waechter, der nichts findet und ` +
      'gruen meldet, ist keine Pruefung — das ist die Negativkontrolle gegen das leere Gruen.',
  );
});

test('Rollen-Sammler: genau EIN kanonischer Block im Serverbaum (B)', () => {
  const where = blocks.map((b) => `${b.file}:${b.from}-${b.to ?? '?'}`).join(', ') || '(keiner)';
  assert.equal(
    blocks.length,
    1,
    `Erwartet: genau 1 kanonischer Rollen-Sammler-Block. Gefunden: ${blocks.length} — ${where}. ` +
      '0 heisst, der Sammler ist entfernt oder der Marker verstuemmelt; >1 heisst, es gibt wieder ' +
      'zwei Fassungen, und ab da driften sie.',
  );
  assert.ok(blocks[0].closed, `Block in ${blocks[0].file}:${blocks[0].from} hat keinen ENDE-Marker.`);
});

test('Rollen-Sammler: der Block ist zeichengleich zur kanonischen Fassung (C)', () => {
  for (const b of blocks) {
    assert.equal(
      b.sha256,
      CANONICAL_SHA256,
      `${b.file}:${b.from}-${b.to} weicht vom kanonischen Rollen-Sammler ab.\n` +
        `  erwartet ${CANONICAL_SHA256}\n  gemessen ${b.sha256}\n` +
        'Diese Funktion ist in NEUN Repos zeichengleich. Sie wird nicht lokal angepasst — eine ' +
        'Aenderung gehoert in alle neun, sonst ist die Drift zurueck.',
    );
  }
});

test('Rollen-Sammler: kein zweiter Sammler daneben (D)', () => {
  for (const r of exempted) {
    console.log(`[rollen-sammler] Ausnahme: ${r.file}:${r.line}  ${r.text}`);
  }
  const listed = outside.map((r) => `  ${r.file}:${r.line}  ${r.text}`).join('\n');
  assert.equal(
    outside.length,
    0,
    `${outside.length} Lesestelle(n) des aktiven Rollenzustands liegen AUSSERHALB des kanonischen ` +
      `Blocks und tragen keine Ausnahme:\n${listed}\n` +
      'Entweder ueber `rolesOfContext(ctx)` fuehren, oder — wenn dort wirklich eine andere Frage ' +
      `gestellt wird — mit \`${EXEMPTION_MARKER}: <Grund>\` in einem Kommentar darueber begruenden.`,
  );
});
