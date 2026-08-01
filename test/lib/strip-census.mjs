// test/lib/strip-census.mjs
// -----------------------------------------------------------------------------
// Zensus der stripComments-KLASSE — misst die EIGENSCHAFT einer .replace()-Kette,
// nie ihre SCHREIBWEISE ([[kommentar-entferner-in-waechtern]]).
//
// BEWUSST EINE KOPIE, KEIN REPO-UEBERGREIFENDER IMPORT
// ([[host-toolchain-fuer-plugin-repos]]): die Plugin-Repos sind eigenstaendige
// npm-Pakete. Pro Repo eine korrekte Kopie.
//
// WARUM ES DIESE DATEI GIBT (Ticket BUENDEL AO, Nachfolger von 179fba72 AL):
// Der Zensus wurde zweimal in /var/tmp gebaut und zweimal mit dem Verzeichnis
// weggeraeumt. Beim zweiten Mal war die Messform selbst fehlerhaft: ein
// Regex-Extraktor ueberlas das Kettenende und ein isolierter Ausfuehrungsrahmen
// warf bei jeder Kette mit freien Variablen. Ergebnis: 62 von 543 Ketten hatten
// ueberhaupt kein ausgefuehrtes Urteil, sondern nur ein gelesenes.
//
// Die drei Reparaturen, die daraus folgen und hier drinstecken:
//   1. ECHTER ZEICHENSCANNER statt Regex-Griff. Er kennt Strings, Template-
//      Literale, Regex-Literale und Kommentare und findet das Kettenende per
//      Klammerabgleich. Damit endet keine Kette mehr im Folgecode.
//   2. PROXY-SCOPE fuer freie Bezeichner. `ROOT`, `SEP`, `absUrl(u)`,
//      `lat.toFixed(6)` werfen nicht mehr, sondern liefern einen harmlosen Stub.
//   3. TYPLOESCHUNG per esbuild (falls vorhanden). TS-Annotationen sind zur
//      Laufzeit bedeutungslos, ihre Loeschung kann das Verhalten nicht aendern.
//
// ⚠️ KONTROLLSONDEN: zu jeder Kommentarsonde gehoert eine gleich gebaute Sonde
// OHNE Kommentarzeichen. Ohne sie zaehlt jede Kette, die an derselben Stelle
// Text wegschneidet (`erste N Zeilen ab`, `alles ab dem ersten ;`), als
// Kommentar-Entferner und wird prompt als Defekt gemeldet. Genau das ist beim
// Bau zweimal passiert.
// -----------------------------------------------------------------------------

// scan.mjs — echter Zeichenscanner fuer JS/TS.
// Liefert eine Maske gleicher LAENGE wie die Quelle, in der jedes Zeichen als
// c = code | s = string | t = template-text | r = regex-literal | k = kommentar
// markiert ist. Template-Ausdruecke ${...} werden wieder als code gescannt,
// damit eine .replace()-Kette INNERHALB eines Template-Literals gefunden wird
// ([[waechter-am-quelltext-geht-am-template-literal-blind]]).

const ID = /[A-Za-z0-9_$]/;

// Nach diesen Token darf ein '/' ein Regex-Literal beginnen (sonst ist es Division).
const REGEX_OK_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function regexAllowed(src, mask, i) {
  // letztes signifikantes Code-Zeichen vor i suchen
  let j = i - 1;
  while (j >= 0 && (mask[j] === 'k' || /\s/.test(src[j]))) j--;
  if (j < 0) return true;
  const ch = src[j];
  if (mask[j] === 's' || mask[j] === 't' || mask[j] === 'r') return false;
  if (')]'.includes(ch)) return false;      // (a)/b  a[0]/b  -> Division
  if (ID.test(ch)) {
    // Bezeichner ODER Schluesselwort? Schluesselwort -> Regex erlaubt.
    let k = j;
    while (k >= 0 && ID.test(src[k])) k--;
    const word = src.slice(k + 1, j + 1);
    if (REGEX_OK_KEYWORDS.has(word)) return true;
    return false;                            // Variable/Zahl -> Division
  }
  return true;                               // = ( , : ; ! & | ? { } etc.
}

export function scan(src) {
  const mask = new Array(src.length).fill('c');
  // Stack fuer Template-Verschachtelung: jedes Element = Anzahl offener { im ${}
  const tmplStack = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    const nx = src[i + 1];

    // --- Template-TEXT zuerst: darin ist '//' kein Kommentar und '"' kein
    //     String-Anfang. Diese Pruefung MUSS vor allen anderen stehen. ---
    if (tmplStack.length && tmplStack[tmplStack.length - 1] === -1) {
      if (ch === '\\') { mask[i++] = 't'; if (i < src.length) mask[i++] = 't'; continue; }
      if (ch === '`') { mask[i++] = 't'; tmplStack.pop(); continue; }
      if (ch === '$' && nx === '{') {
        mask[i++] = 't'; mask[i++] = 'c';     // ${ oeffnet Code
        tmplStack[tmplStack.length - 1] = 0;  // 0 offene innere {
        continue;
      }
      mask[i++] = 't';
      continue;
    }

    // --- Zeilenkommentar ---
    if (ch === '/' && nx === '/') {
      while (i < src.length && src[i] !== '\n') mask[i++] = 'k';
      continue;
    }
    // --- Blockkommentar ---
    if (ch === '/' && nx === '*') {
      mask[i++] = 'k'; mask[i++] = 'k';
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) mask[i++] = 'k';
      if (i < src.length) { mask[i++] = 'k'; mask[i++] = 'k'; }
      continue;
    }
    // --- Anfuehrungszeichen-String ---
    if (ch === '"' || ch === "'") {
      const q = ch;
      mask[i++] = 's';
      while (i < src.length) {
        if (src[i] === '\\') { mask[i++] = 's'; if (i < src.length) mask[i++] = 's'; continue; }
        if (src[i] === q) { mask[i++] = 's'; break; }
        if (src[i] === '\n') break;           // unterminiert -> abbrechen
        mask[i++] = 's';
      }
      continue;
    }
    // --- Template-Literal ---
    if (ch === '`') {
      mask[i++] = 't';
      tmplStack.push(-1);                     // -1 = im Template-Text
      continue;
    }
    // --- im ${ }-Code eines Templates: Klammern zaehlen ---
    if (tmplStack.length && tmplStack[tmplStack.length - 1] >= 0) {
      if (ch === '{') { tmplStack[tmplStack.length - 1]++; mask[i++] = 'c'; continue; }
      if (ch === '}') {
        if (tmplStack[tmplStack.length - 1] === 0) {
          mask[i++] = 't';                    // schliesst ${...} -> zurueck in Template-Text
          tmplStack[tmplStack.length - 1] = -1;
          continue;
        }
        tmplStack[tmplStack.length - 1]--; mask[i++] = 'c'; continue;
      }
    }
    // --- Regex-Literal ---
    if (ch === '/' && regexAllowed(src, mask, i)) {
      let j = i + 1, inClass = false, ok = false;
      while (j < src.length) {
        const c = src[j];
        if (c === '\\') { j += 2; continue; }
        if (c === '\n') break;
        if (c === '[') inClass = true;
        else if (c === ']') inClass = false;
        else if (c === '/' && !inClass) { ok = true; break; }
        j++;
      }
      if (ok) {
        for (let k = i; k <= j; k++) mask[k] = 'r';
        j++;
        while (j < src.length && /[dgimsuvy]/.test(src[j])) mask[j++] = 'r';
        i = j;
        continue;
      }
    }
    mask[i++] = 'c';
  }
  return mask;
}

// Findet alle .replace(/.replaceAll( Aufrufe, die IM CODE stehen, und liefert
// je zusammenhaengender Kette EINEN Eintrag mit exaktem Ende (Klammerabgleich).
export function extractChains(src) {
  const mask = scan(src);
  const isCode = (k) => mask[k] === 'c';
  const out = [];
  const consumed = new Set();

  const callAt = (k) => {
    // steht an Position k ein `.replace(` oder `.replaceAll(` im Code?
    if (src[k] !== '.' || !isCode(k)) return null;
    let j = k + 1;
    while (j < src.length && /\s/.test(src[j]) && isCode(j)) j++;
    for (const name of ['replaceAll', 'replace']) {
      if (src.startsWith(name, j) && isCode(j)) {
        let p = j + name.length;
        while (p < src.length && /\s/.test(src[p])) p++;
        if (src[p] === '(' && isCode(p)) return { open: p, name };
      }
    }
    return null;
  };

  // Klammerabgleich, der Strings/Templates/Regex/Kommentare ueberspringt.
  const matchParen = (open) => {
    let depth = 0;
    for (let k = open; k < src.length; k++) {
      if (!isCode(k)) continue;
      if (src[k] === '(') depth++;
      else if (src[k] === ')') { depth--; if (depth === 0) return k; }
    }
    return -1;
  };

  for (let i = 0; i < src.length; i++) {
    if (consumed.has(i)) continue;
    const c = callAt(i);
    if (!c) continue;
    // Kette ab hier so weit wie moeglich verlaengern
    let start = i, end = -1, cur = c, links = 0;
    while (cur) {
      const close = matchParen(cur.open);
      if (close < 0) break;
      end = close; links++;
      let n = close + 1;
      while (n < src.length && /\s/.test(src[n]) && isCode(n)) n++;
      const nextCall = callAt(n);
      if (!nextCall) break;
      consumed.add(n);
      cur = nextCall;
    }
    if (end < 0) continue;
    const line = src.slice(0, start).split('\n').length;
    out.push({ start, end, links, line, text: src.slice(start, end + 1) });
    i = end;
  }
  return out;
}

// classify.mjs — fuehrt eine .replace()-Kette AUS und urteilt ueber ihre
// EIGENSCHAFT, nie ueber ihre Schreibweise ([[kommentar-entferner-in-waechtern]]).

// --- Sondenfaelle -----------------------------------------------------------
// Jede Sonde traegt genau EINEN Marker. Ueberlebt/stirbt der Marker, ist die
// Eigenschaft belegt. Der Marker ist absichtlich ein Bezeichner ohne Sonderzeichen.
// Zu JEDER Kommentarsonde gehoert eine KONTROLLSONDE gleicher Gestalt, in der
// die Kommentarzeichen durch harmlose ersetzt sind. Nur wenn die Kette die
// Sonde toetet und die Kontrolle VERSCHONT, entfernt sie wirklich Kommentare.
// Ohne diese Kontrolle zaehlt jede Kette, die Text an derselben Stelle
// wegschneidet (erste N Zeilen abschneiden, alles ab ';' verwerfen), als
// Kommentar-Entferner — und wird prompt als BLIND/UNTERSTRIPPT gemeldet.
export const PROBES = {
  // '//' steckt in einer URL -> der Marker DAHINTER muss ueberleben
  URL:           "const e = 'https://x.com/a'; const MARKER = 1;",
  // Kommentar HINTER Code -> Marker muss verschwinden
  TRAIL:         "foo(); // MARKER",
  TRAIL_CTRL:    "foo(); zz MARKER",
  // ganze Kommentarzeile -> Marker muss verschwinden
  LINEFULL:      "  // MARKER\nfoo();",
  LINEFULL_CTRL: "  zz MARKER\nfoo();",
  // Blockkommentar -> Marker muss verschwinden
  BLOCK:         "foo(); /* MARKER */",
  BLOCK_CTRL:    "foo(); zz MARKER zz",
  // lebender Code ohne jeden Kommentar -> Marker muss IMMER ueberleben
  ALIVE:         "const MARKER = compute(1, 2);",
  // ÜBERSTRIPPT-Sonden: lebender Code ZWISCHEN zwei Kommentaren.
  // Ein gieriges [\s\S]* statt [\s\S]*? frisst alles zwischen dem ersten /*
  // und dem letzten */ — der Code dazwischen verschwindet still.
  OVER_BLOCK:    "/* a */ const MARKER = 1; /* b */",
  // Ein Zeilenstripper, der bis DATEIENDE statt bis Zeilenende loescht
  // (z.B. /\\/\\/[\\s\\S]*/ oder das s-Flag), frisst die Folgezeilen.
  OVER_LINE:     "foo(); // c\nconst MARKER = 1;",
};

// --- Ausfuehrungsrahmen -----------------------------------------------------
// Freie Bezeichner (ROOT, STR, SEP ...) liessen die Kette als isolierte Funktion
// werfen -> das war die Ursache 'LAUFZEITFEHLER'. Ein Proxy-Scope beantwortet
// JEDEN unbekannten Bezeichner mit einer harmlosen Zeichenkette, echte Globals
// (String, RegExp, Math ...) reicht er durch.
const STUB_STR = 'ZZFREEVARZZ';

// Ein freier Bezeichner kann als Wert, als FUNKTION (`absUrl(u)`) oder als
// Traeger von Methoden (`lat.toFixed(6)`) auftreten. Eine blosse Zeichenkette
// als Stub wirft in beiden letzten Faellen -> 'LAUFZEITFEHLER'. Dieser Stub
// ist aufrufbar, konstruierbar, verhaelt sich bei String-Methoden wie eine
// Zeichenkette und liefert sonst wieder sich selbst.
const STUB = new Proxy(function stub() {}, {
  get(_t, k) {
    // Symbol-Protokolle NICHT beantworten: haette der Stub Symbol.replace,
    // wuerde String.prototype.replace ihn als Regex-Ersatz behandeln und die
    // Kette lieferte ein Objekt statt einer Zeichenkette.
    if (typeof k === 'symbol') {
      if (k === Symbol.toPrimitive) return () => STUB_STR;
      if (k === Symbol.toStringTag) return 'String';
      return undefined;
    }
    if (k === 'toString' || k === 'valueOf') return () => STUB_STR;
    const sv = /** @type {any} */ (STUB_STR)[k];
    if (typeof sv === 'function') return sv.bind(STUB_STR);
    if (sv !== undefined) return sv;
    return STUB;
  },
  apply() { return STUB; },
  construct() { return STUB; },
  has() { return true; },
});
// Der Rahmen reicht die Sonde als __S__ herein. Wuerde der Proxy auch diesen
// Namen beantworten, bekaeme JEDE Kette den Stub statt der Sonde zu sehen und
// das gesamte Zensusergebnis waere 'KEIN_ENTFERNER'. (Vom Selbsttest gefangen.)
const PASSTHROUGH = new Set(['__S__', '__scope__']);
const scopeProxy = new Proxy(Object.create(null), {
  has(_t, key) {
    if (typeof key === 'symbol') return false;
    if (PASSTHROUGH.has(key)) return false;                     // Rahmen-Bezeichner
    if (key === 'undefined' || key in globalThis) return false; // echtes Global
    return true;                                                // alles andere stubben
  },
  get(_t, key) {
    if (typeof key === 'symbol') return undefined;
    return STUB;
  },
});

// TypeScript-Annotationen (`(c: string) =>`, `x as any`) sind zur LAUFZEIT
// bedeutungslos. Sie zu loeschen kann das Verhalten der Kette also nicht
// aendern — eine typgeloeschte Kette ist ein originalgetreuer Pruefgegenstand.
// Ohne diesen Schritt bleibt jede Kette in einer .ts/.tsx-Datei UNPARSEBAR.
import { createRequire } from 'node:module';
let transformSync = null;
try { transformSync = createRequire(import.meta.url)('esbuild').transformSync; } catch { /* optional */ }

function eraseTypes(chainText) {
  if (!transformSync) return null;
  try {
    const js = transformSync(`__S__${chainText}`, {
      loader: 'ts', format: 'esm', target: 'es2022',
    }).code.trim().replace(/;\s*$/, '');
    return js.startsWith('__S__') ? js.slice('__S__'.length) : null;
  } catch {
    return null;
  }
}

const cache = new Map();

function compile(chainText) {
  if (cache.has(chainText)) return cache.get(chainText);
  let fn = null, err = null;
  try {
    // eslint-disable-next-line no-new-func
    const factory = new Function(
      '__scope__',
      `return function (__S__) { with (__scope__) { return __S__${chainText}; } };`,
    );
    fn = factory(scopeProxy);
  } catch (e) {
    err = e;
    // zweiter Versuch mit geloeschten TS-Typen
    const js = eraseTypes(chainText);
    if (js) {
      try {
        // eslint-disable-next-line no-new-func
        const factory2 = new Function(
          '__scope__',
          `return function (__S__) { with (__scope__) { return __S__${js}; } };`,
        );
        fn = factory2(scopeProxy);
        err = null;
      } catch (e2) { err = e2; }
    }
  }
  const res = { fn, err };
  cache.set(chainText, res);
  return res;
}

export function runProbe(chainText, input) {
  const { fn, err } = compile(chainText);
  if (!fn) return { ok: false, reason: 'UNPARSEBAR', detail: String(err && err.message) };
  try {
    const out = fn(input);
    if (typeof out !== 'string') {
      return { ok: false, reason: 'LAUFZEITFEHLER', detail: `Rueckgabe ist ${typeof out}, nicht string` };
    }
    return { ok: true, out };
  } catch (e) {
    return { ok: false, reason: 'LAUFZEITFEHLER', detail: String(e && e.message) };
  }
}

// Traegt ein (evtl. abgeschnittener) Kettentext ueberhaupt Kommentar-Form?
// Genau dieser Grep ueber abgeschnittenem Text ist die Messform, die AL selbst
// widerlegt hat — er dient hier NUR noch dazu, die Restluecke zu beziffern,
// nie zum Urteil. Der Selbsttest belegt, dass er bei echten Strippern anschlaegt.
export const hasCommentForm = (t) =>
  /\\?\/\\?\//.test(t) || /\/\\?\*|\\?\/\\?\*/.test(t) || t.includes('//') || t.includes('/*');

// --- Urteil -----------------------------------------------------------------
// KEIN_ENTFERNER  Kette fasst Kommentare nicht an          -> nicht unser Thema
// BLOCKONLY       entfernt nur /* */ (CSS/HTML-Faelle)     -> KEIN Defekt (Falle 3)
// KORREKT         toetet Trailing-Kommentar, URL ueberlebt
// BLIND           toetet Trailing-Kommentar, frisst aber die URL-Zeile -> falsch GRUEN
// UNTERSTRIPPT    toetet nur ganze Kommentarzeilen         -> falsch ROT
// UNMESSBAR       Kette laesst sich nicht ausfuehren
export function classify(chainText) {
  const r = {};
  for (const [name, input] of Object.entries(PROBES)) {
    const res = runProbe(chainText, input);
    if (!res.ok) return { verdict: 'UNMESSBAR', reason: res.reason, detail: res.detail, probes: r };
    r[name] = res.out;
  }
  const has = (name) => r[name].includes('MARKER');

  // Eine Kette, die lebenden Code ohne Kommentar zerstoert, ist kein
  // Kommentar-Entferner, sondern etwas anderes (z.B. eine Maskierung).
  if (!has('ALIVE')) return { verdict: 'KEIN_ENTFERNER', reason: 'faellt schon ueber kommentarfreien Code', probes: r };

  // toetet die Sonde UND verschont die Kontrolle -> wirklich kommentarbezogen
  const killsTrail = !has('TRAIL') && has('TRAIL_CTRL');
  const killsLine = !has('LINEFULL') && has('LINEFULL_CTRL');
  const killsBlock = !has('BLOCK') && has('BLOCK_CTRL');
  const urlSafe = has('URL');

  // Kette schneidet an derselben Stelle Text weg, egal ob dort ein Kommentar
  // steht -> Textbearbeitung, kein Kommentar-Entferner.
  const blindCut = (!has('TRAIL') && !has('TRAIL_CTRL'))
    || (!has('LINEFULL') && !has('LINEFULL_CTRL'))
    || (!has('BLOCK') && !has('BLOCK_CTRL'));

  if (!killsTrail && !killsLine && !killsBlock) {
    return {
      verdict: 'KEIN_ENTFERNER',
      reason: blindCut ? 'schneidet Text unabhaengig von Kommentaren weg' : 'toetet keine Kommentarform',
      probes: r,
    };
  }
  // ÜBERSTRIPPT wird NACH BLIND geprueft: ein blinder Waechter meldet falsch
  // gruen und ist damit die schlimmere Richtung.
  const overBlock = !has('OVER_BLOCK');
  const overLine = !has('OVER_LINE');
  const overstripped = (why) => ({ verdict: 'UEBERSTRIPPT', reason: why, probes: r });

  if (killsTrail) {
    if (!urlSafe) return { verdict: 'BLIND', reason: 'URL-Zeile wird gefressen', probes: r };
    if (overLine) return overstripped('loescht ueber das Zeilenende hinaus');
    if (overBlock) return overstripped('gieriges [\\s\\S]* frisst Code zwischen zwei Bloecken');
    return { verdict: 'KORREKT', probes: r };
  }
  if (killsLine) {
    // toetet Zeilenkommentare, aber nur am Zeilenanfang
    return urlSafe
      ? { verdict: 'UNTERSTRIPPT', reason: 'nur ganze Kommentarzeilen', probes: r }
      : { verdict: 'BLIND', reason: 'URL-Zeile wird gefressen', probes: r };
  }
  // nur Bloecke
  if (!urlSafe) return { verdict: 'BLIND', reason: 'URL-Zeile wird gefressen', probes: r };
  if (overBlock) return overstripped('gieriges [\\s\\S]* frisst Code zwischen zwei Bloecken');
  return { verdict: 'BLOCKONLY', reason: 'entfernt ausschliesslich /* */', probes: r };
}
