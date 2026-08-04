// test/field-definition-heal.test.mjs
// -----------------------------------------------------------------------------
// DIE DRITTE ACHSE: eine Felddefinition, die eingefroren ist — und der
// Zwangspunkt, der sie nicht eingefroren bleiben laesst.
//
// DER BEFUND (gemessen bei @neomodul/crm, 2026-08-04, crm #164/#166)
// -------------------------------------------------------------------
// crm #164 reduzierte `mail_accounts.adapter` von drei Auswahlwerten auf einen.
// Danach war JEDES Abnahmesignal gruen — `grep` im ausgelieferten
// `dist/server/index.js` meldete 0 Treffer fuer die entfernten Werte, dist-check
// reproduzierte, die Pin-Kaskade stand — und die Admin-Maske bot beide weiter an.
// NocoBase liest Felddefinitionen zur LAUFZEIT aus der Tabelle `fields`, nicht
// aus dem Buendel; `ensureField` ist idempotent auf EXISTENZ, und ein Neustart
// heilt nichts (gemessen, mit neu gestartetem Container).
//
// WARUM DIESES PLUGIN DIESELBE FALLE HAT (gemessen 2026-08-05, Sandkasten)
// ------------------------------------------------------------------------
// neoai provisioniert ueber denselben Collection-Manager-Pfad wie crm:
//
//   select count(*) from fields where "collectionName" like 'neoai\_%';  -> 245
//   GET /api/collections/neoai_runs/fields:list -> 17 Felder, `status` mit der
//     GESPEICHERTEN Auswahlliste
//
// Gegenprobe, die zeigt, dass die Falle nicht jedes Plugin trifft:
// @neomodul/pdf-generator definiert seine Sammlungen ueber `db.collection()` und
// hat 0 Zeilen in `fields` — dort kann nichts einfrieren, und dort gibt es
// deshalb auch keinen Sweep.
//
// WIE DIESER WAECHTER GESCHNITTEN IST
// ------------------------------------
// Ein Waechter, der die SCHREIBWEISE prueft („der String X darf nicht
// vorkommen"), faellt beim naechsten Namen um und zwingt dazu, genau die
// Kommentare zu loeschen, die den Fehler erklaeren
// ([[waechter-brauchen-einen-zwangspunkt]]). Geprueft wird deshalb die TATSACHE:
// eine gespeicherte Auswahlliste, die von der deklarierten abweicht, muss beim
// Start zurueckgezogen werden — fuer JEDES deklarierte Auswahlfeld dieses
// Plugins, aus dem ECHTEN Register, nie aus einer gepflegten Liste.
//
// Die beiden Negativkontrollen sind der andere, tragende Teil: ein GESUNDER Boot
// darf NICHT schreiben (sonst waere das Gruen auch von einem Sweep zu erreichen,
// der bei jedem Start jedes Feld ueberschreibt), und die Inventarpruefung darf
// nicht dadurch bestehen, dass das Inventar LEER ist.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  collectDeclaredOptionLists,
  healFieldDefinitions,
  optionListsAgree,
} from '../src/server/lib/schema-heal.ts';
import { NEOAI_COLLECTIONS, NEOAI_EXTRA_FIELDS } from '../src/server/collections.ts';

// ---- Doubles ----------------------------------------------------------------

/** Eine `fields`-Zeile, wie NocoBases MagicAttributeModel sie ausliefert. */
const row = (uiSchema) => ({
  get: (key) => (key === 'uiSchema' ? uiSchema : key === 'options' ? { uiSchema } : undefined),
  load: async () => {},
});

function makeRepo(rows) {
  const updates = [];
  const reloaded = [];
  return {
    updates,
    reloaded,
    findOne: async ({ filter }) => rows[`${filter.collectionName}.${filter.name}`] ?? null,
    update: async ({ filter, values }) => {
      updates.push({ label: `${filter.collectionName}.${filter.name}`, values });
    },
    reloadField: async (r) => reloaded.push(r),
  };
}

const silentLogger = () => {
  const lines = [];
  return { lines, info: (m) => lines.push(m), warn: (m) => lines.push(m) };
};

/** Die gelieferte Deklaration eines Auswahlfeldes und eine veraltete Kopie davon. */
const DECLARED = [
  { label: 'Entwurf', value: 'draft' },
  { label: 'Veroeffentlicht', value: 'published' },
];
const STALE = [
  { label: 'Entwurf', value: 'draft' },
  { label: 'Veroeffentlicht', value: 'published' },
  { label: 'Zurueckgezogen', value: 'retired' },
];

// ---- Der Vergleich ----------------------------------------------------------

test('optionListsAgree: eine laengere gespeicherte Liste erfuellt eine kuerzere Deklaration NICHT', () => {
  assert.equal(optionListsAgree(DECLARED, STALE), false);
});

test('optionListsAgree: gleiche Liste stimmt zu', () => {
  assert.equal(optionListsAgree(DECLARED, DECLARED.map((o) => ({ ...o }))), true);
});

test('optionListsAgree: ein Schluessel, den NUR die gespeicherte Kopie traegt, ist KEIN Drift', () => {
  // Sonst schriebe der Sweep bei jedem einzelnen Start jedes Feld neu, sobald
  // NocoBase die gespeicherte Definition um irgendetwas anreichert. Auf DIESER
  // Installation reichert es heute nichts an (gemessen 2026-08-05: 0 von 6
  // gespeicherten Listen tragen einen zusaetzlichen Schluessel) — die Asymmetrie
  // ist also nicht die Zahl, die den Sweep rettet, sondern die Zusicherung, dass
  // eine kuenftige Anreicherung ihn nicht in einen Schreibsturm verwandelt.
  const enriched = DECLARED.map((o) => ({ ...o, 'x-index': 1 }));
  assert.equal(optionListsAgree(DECLARED, enriched), true);
});

test('optionListsAgree: geaenderte Beschriftung, veraenderte Reihenfolge und Laenge sind Drift', () => {
  assert.equal(optionListsAgree(DECLARED, [{ ...DECLARED[0], label: 'Draft' }, DECLARED[1]]), false);
  assert.equal(optionListsAgree(DECLARED, [DECLARED[1], DECLARED[0]]), false);
  assert.equal(optionListsAgree(DECLARED, [DECLARED[0]]), false);
});

test('optionListsAgree: eine fehlende oder untypische gespeicherte Liste ist Drift, kein Absturz', () => {
  assert.equal(optionListsAgree(DECLARED, undefined), false);
  assert.equal(optionListsAgree(DECLARED, null), false);
  assert.equal(optionListsAgree(DECLARED, 'draft'), false);
});

// ---- Der Sweep --------------------------------------------------------------

test('healFieldDefinitions zieht die veraltete Auswahlliste auf die Deklaration zurueck', async () => {
  const repo = makeRepo({
    'neoai_workflows.status': row({ type: 'string', title: 'Status', 'x-component': 'Select', enum: STALE }),
  });
  const logger = silentLogger();
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: repo, logger, reloadField: repo.reloadField },
  );

  assert.deepEqual(report.healed, ['neoai_workflows.status']);
  assert.equal(repo.updates.length, 1);
  assert.deepEqual(repo.updates[0].values.uiSchema.enum, DECLARED);
  // Der Schreibvorgang traegt die VOLLE uiSchema, nicht nur `enum`: sonst haengt
  // die Richtigkeit an NocoBases Merge-Verhalten fuer magische Attribute, und
  // eine Aenderung dort truebte die Definition still.
  assert.equal(repo.updates[0].values.uiSchema.title, 'Status');
  assert.equal(repo.updates[0].values.uiSchema['x-component'], 'Select');
  // Ein LAUFENDER Prozess liefert danach die neue Definition aus.
  assert.equal(repo.reloaded.length, 1);
  assert.equal(logger.lines.length, 1, 'die Korrektur ist die einzige Zeile, und sie faellt auf');
});

test('NEGATIVKONTROLLE 1 — gesunder Boot: kein Schreibvorgang, keine Zeile im Log', async () => {
  // Ohne sie waere dieser Test auch von einem Sweep zu bestehen, der bei jedem
  // Start jedes Feld ueberschreibt — auf einer Instanz mit vielen Feldern und
  // mehreren Arbeitern genau die Schreiblast, die hier vermieden wird.
  const repo = makeRepo({ 'neoai_workflows.status': row({ title: 'Status', enum: DECLARED }) });
  const logger = silentLogger();
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: repo, logger, reloadField: repo.reloadField },
  );
  assert.deepEqual(report.healed, []);
  assert.equal(report.checked, 1);
  assert.equal(repo.updates.length, 0);
  assert.equal(repo.reloaded.length, 0);
  assert.deepEqual(logger.lines, []);
});

test('ein noch nicht provisioniertes Feld ist gemeldet, aber kein Fehler und kein Schreibvorgang', async () => {
  const repo = makeRepo({});
  const logger = silentLogger();
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: repo, logger },
  );
  assert.deepEqual(report.unprovisioned, ['neoai_workflows.status']);
  assert.deepEqual(report.failed, []);
  assert.equal(repo.updates.length, 0);
  assert.deepEqual(logger.lines, [], 'das ist die Aufgabe von setup(), keine Warnung wert');
});

test('ein scheiternder Schreibvorgang nimmt den Start NICHT herunter', async () => {
  const repo = makeRepo({ 'neoai_workflows.status': row({ enum: STALE }) });
  repo.update = async () => {
    throw new Error('connection terminated unexpectedly');
  };
  const logger = silentLogger();
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: repo, logger },
  );
  assert.deepEqual(report.failed, ['neoai_workflows.status']);
  assert.deepEqual(report.healed, []);
  assert.match(logger.lines.join('\n'), /boot is not blocked/);
});

test('ein gleichzeitig startender Arbeiter, der zuerst schreibt, ist Erfolg — kein Fehlschlag', async () => {
  const repo = makeRepo({ 'neoai_workflows.status': row({ enum: STALE }) });
  repo.update = async () => {
    const err = new Error('duplicate key value violates unique constraint');
    err.code = '23505';
    throw err;
  };
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: repo, logger: silentLogger() },
  );
  assert.deepEqual(report.raced, ['neoai_workflows.status']);
  assert.deepEqual(report.failed, []);
});

test('ohne Repository wird gewarnt statt geworfen', async () => {
  const logger = silentLogger();
  const report = await healFieldDefinitions(
    [{ owner: 'core', collection: 'neoai_workflows', name: 'status', options: DECLARED }],
    { fieldsRepo: null, logger },
  );
  assert.equal(report.checked, 0);
  assert.match(logger.lines.join('\n'), /fields repository is unavailable/);
});

test('ein missgebildeter Registereintrag wird gemeldet und uebersprungen, nie geworfen', async () => {
  const logger = silentLogger();
  const report = await healFieldDefinitions([{ owner: 'core', collection: 'neoai_runs' }], {
    fieldsRepo: makeRepo({}),
    logger,
  });
  assert.deepEqual(report.failed, ['neoai_runs.?']);
  assert.match(logger.lines.join('\n'), /malformed entry/);
});

// ---- Der Zwangspunkt: das ECHTE Register, nicht ein erfundenes ---------------

/** Genau die Quellenliste, die plugin.ts an den Sweep uebergibt. */
const realSources = () => [
  { owner: 'core', collections: NEOAI_COLLECTIONS, extraFields: NEOAI_EXTRA_FIELDS },
];

/** Jedes deklarierte Feld dieses Plugins, unabhaengig vom Sweep aufgesammelt. */
function everyDeclaredField() {
  const out = [];
  for (const s of realSources()) {
    for (const def of s.collections ?? []) for (const f of def.fields ?? []) out.push({ collection: def.name, field: f });
    for (const e of s.extraFields ?? []) out.push({ collection: e.collection, field: e.field });
  }
  return out;
}

test('NEGATIVKONTROLLE 2 — das Inventar deckt JEDES deklarierte Auswahlfeld ab und ist nicht leer', () => {
  const inventory = collectDeclaredOptionLists(realSources());
  const covered = new Set(inventory.map((e) => `${e.collection}.${e.name}`));
  const selects = everyDeclaredField().filter((e) => e.field?.interface === 'select');

  // Der Boden gegen das leere gruene Gate: dieser Test darf nicht dadurch
  // bestehen, dass es nichts zu pruefen gibt. Am 2026-08-05 waren es 6 — sinkt
  // die Zahl, ist die Abdeckung geschrumpft und der Grund gehoert angesehen,
  // bevor der Boden gesenkt wird.
  assert.ok(selects.length >= 6, `erwartet >=6 deklarierte Auswahlfelder, gemessen ${selects.length}`);

  const missing = selects.map((e) => `${e.collection}.${e.field.name}`).filter((label) => !covered.has(label));
  assert.deepEqual(missing, [], 'jedes Auswahlfeld muss im Sweep landen, sonst friert seine Auswahl ein');
  assert.equal(inventory.length, selects.length);
});

test('jede deklarierte Auswahlliste ist wohlgeformt — der Sweep repariert sonst AUF einen Fehler hin', () => {
  // Der Sweep zieht gespeicherte Zeilen auf die Deklaration. Also muss die
  // Deklaration selbst tragfaehig sein: jeder Eintrag braucht einen `value`,
  // und kein Wert darf doppelt vorkommen.
  const problems = [];
  for (const entry of collectDeclaredOptionLists(realSources())) {
    const values = entry.options.map((o) => (o && typeof o === 'object' ? o.value : o));
    if (values.some((v) => v === undefined || v === null || v === '')) {
      problems.push(`${entry.collection}.${entry.name}: Eintrag ohne value`);
    }
    if (new Set(values.map(String)).size !== values.length) {
      problems.push(`${entry.collection}.${entry.name}: doppelter value (${values.join(', ')})`);
    }
  }
  assert.deepEqual(problems, []);
});

// plugin.ts importiert @nocobase/server und ist hier nicht einlesbar — die
// Verdrahtung wird deshalb am Quelltext festgenagelt. Ohne diesen Test waere die
// ganze Datei darueber totes Gewicht: ein Sweep, den niemand aufruft, ist kein
// Sweep ([[waechter-brauchen-einen-zwangspunkt]], Regel 1).
const pluginSource = readFileSync(new URL('../src/server/plugin.ts', import.meta.url), 'utf8');

test('plugin.ts ruft den Definitions-Sweep beim Start auf', () => {
  assert.match(pluginSource, /await this\.healFieldDefinitionsOnBoot\(\);/);
  assert.match(pluginSource, /this\.app\.on\('afterStart'/);
});

test('der Sweep laeuft VOR der ACL-Abloesung — sonst haengt sein Schreibvorgang die Sammlung wieder an', () => {
  // `detach('afterStart')` muss das letzte Wort behalten: das Schreiben einer
  // Metadatenzeile haengt einen Sammlungsnamen hinter unserem Ruecken wieder an
  // `acl.strategyResources`. afterStart-Handler laufen in
  // REGISTRIERUNGSreihenfolge, also muss die Registrierung dieses Sweeps vor der
  // des Handlers stehen, der `detach('afterStart')` ruft.
  //
  // Gesucht wird die ANWEISUNG, nicht ihr Vorkommen: der Erklaerkommentar
  // darueber nennt `detach('afterStart')` ebenfalls, und ein Waechter, der
  // darueber stolpert, zwingt dazu, genau die Kommentare zu loeschen, die den
  // Grund tragen ([[kommentar-entferner-in-waechtern]]).
  const statements = pluginSource
    .split('\n')
    .map((line, i) => ({ i, code: line.replace(/^\s*/, '') }))
    .filter((l) => !l.code.startsWith('//') && !l.code.startsWith('*'));
  const lineOf = (needle) => statements.find((l) => l.code.includes(needle))?.i ?? -1;

  const iSweep = lineOf('await this.healFieldDefinitionsOnBoot();');
  const iDetach = lineOf("detach('afterStart');");
  assert.ok(iSweep > -1, 'der Sweep-Aufruf muss als Anweisung vorkommen');
  assert.ok(iDetach > -1, "detach('afterStart') muss als Anweisung vorkommen");
  assert.ok(iSweep < iDetach, "der Definitions-Sweep muss VOR detach('afterStart') registriert sein");
});

test('plugin.ts fuettert den Sweep aus dem ECHTEN Register, nicht aus einer Teilmenge', () => {
  assert.match(pluginSource, /collectDeclaredOptionLists\(\[/);
  assert.match(pluginSource, /owner: 'core', collections: NEOAI_COLLECTIONS, extraFields: NEOAI_EXTRA_FIELDS/);
});
