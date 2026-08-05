// test/boot-schema-heal.test.mjs
// -----------------------------------------------------------------------------
// DIE ERSTE UND ZWEITE ACHSE: die Sammlung und das Feld, die auf einer
// BESTEHENDEN Installation nie entstehen — und der Zwangspunkt dagegen.
//
// DER BEFUND
// ----------
// `setup()` haengt in diesem Plugin ausschliesslich an `install()` und
// `afterEnable()`. Beide feuern auf einem gewoehnlichen Deploy NICHT: `pm enable`
// gegen ein bereits aktiviertes Plugin ist ein No-op (bei crm gemessen: 3,9 s
// Nichts gegen 21,4 s echten Lauf), und `load()` fasst die Bereitstellung nicht
// an. NocoBase liest Sammlungen und Felder zur LAUFZEIT aus der Datenbank, nicht
// aus dem Buendel — eine neue Sammlung oder ein neues Feld erreicht eine
// bestehende Installation also nie von selbst, und ein Neustart heilt nichts.
//
// Die Fehlerwirkung ist nicht „ein Feld fehlt in einer Maske", sondern:
// Servercode, der auf das Feld verzweigt, laeuft gegen eine Spalte, die es auf
// dieser Installation nicht gibt — und das zeigt sich beim Kunden, nicht im Test
// des Autors. crm und design-studio haben diese Luecke mit
// `healModuleCollectionsOnBoot`/`healExtraFieldsOnBoot` geschlossen; neoai hatte
// sie bis 2026-08-05 offen (Restpunkt aus neoai #20).
//
// ERST GEMESSEN, DANN GEBAUT (2026-08-05, laufender Sandkasten)
// -------------------------------------------------------------
//   deklariert  13 Sammlungen / 114 Feldnamen (118 Eintraege, 4 doppelt)
//   gespeichert 13 Sammlungen / 114 Feldzeilen
//   FEHLEND:    0 / 0
//
// Der Rueckstand ist HEUTE null. Der Sweep ist deshalb eine Zusicherung fuer das
// naechste Feld, keine Reparatur — und genau diese Messung ist der Grund, warum
// sein Zuschnitt vertretbar ist: ein gesunder Boot liest 13 + 114 Zeilen und
// schreibt nichts.
//
// Warum hier trotzdem ein Sweep steht und nicht — wie bei
// @neomodul/pdf-generator — nur ein Immunitaets-Waechter: pdf-generator ist
// STRUKTURELL immun (`db.collection()` aus `load()`, 0 Zeilen in `fields`).
// Dieses Plugin liegt auf dem Collection-Manager-Pfad; seine 0 ist ein ZUSTAND,
// keine EIGENSCHAFT — und ein Zustand laesst sich nicht festnageln.
//
// WIE DIESER WAECHTER GESCHNITTEN IST
// ------------------------------------
// Geprueft wird die TATSACHE, nicht die Schreibweise: eine deklarierte Sammlung
// bzw. ein deklariertes Feld, das auf einer Installation fehlt, muss beim Start
// entstehen — fuer JEDEN Eintrag des ECHTEN Registers, nie aus einer
// handgepflegten Liste ([[waechter-brauchen-einen-zwangspunkt]]).
//
// Die beiden Negativkontrollen sind der tragende Teil, weil ohne sie ein
// kaputter Sweep gruen bliebe:
//   1. Ein GESUNDER Boot darf NICHT schreiben — sonst bestuende dieser Test auch
//      fuer einen Sweep, der bei jedem Start jede Sammlung und jedes Feld neu
//      anlegt bzw. jedes Feld ALTERt.
//   2. Die Inventarpruefung darf nicht dadurch bestehen, dass das Inventar LEER
//      ist. Ein Wächter ueber einer leeren Auswahl ist mit einem Wächter, der
//      nichts angesehen hat, nicht unterscheidbar.
//
// Und der Waechter DRUCKT die Anzahl des Geprueften — ein Exit-Code ohne Zahl
// ist kein Beleg.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  collectDeclaredFields,
  healExtraFields,
  healModuleCollections,
} from '../src/server/lib/schema-heal.ts';
import { NEOAI_COLLECTIONS, NEOAI_EXTRA_FIELDS } from '../src/server/collections.ts';

// ---- Doubles ----------------------------------------------------------------

const silentLogger = () => {
  const lines = [];
  return { lines, info: (m) => lines.push(m), warn: (m) => lines.push(m) };
};

/** Ein `collections`-Repository mit genau den Namen, die es schon kennt. */
function makeCollectionsRepo(existingNames) {
  const known = new Set(existingNames);
  const created = [];
  return {
    known,
    created,
    findOne: async ({ filter }) => (known.has(filter.name) ? { name: filter.name } : null),
    ensureCollection: async (def) => {
      created.push(def.name);
      known.add(def.name);
    },
  };
}

/** Ein `fields`-Repository mit genau den "sammlung.feld" es schon kennt. */
function makeFieldsRepo(existingLabels) {
  const known = new Set(existingLabels);
  const created = [];
  return {
    known,
    created,
    findOne: async ({ filter }) =>
      known.has(`${filter.collectionName}.${filter.name}`) ? { name: filter.name } : null,
    ensureField: async (collection, field) => {
      created.push(`${collection}.${field.name}`);
      known.add(`${collection}.${field.name}`);
    },
  };
}

const DEFS = [{ name: 'neoai_alpha' }, { name: 'neoai_beta' }];
const FIELDS = [
  { owner: 'core', collection: 'neoai_alpha', field: { name: 'eins' } },
  { owner: 'core', collection: 'neoai_alpha', field: { name: 'zwei' } },
];

// ---- ACHSE 1: die Sammlung --------------------------------------------------

test('healModuleCollections legt genau die fehlende Sammlung an', async () => {
  const repo = makeCollectionsRepo(['neoai_alpha']);
  const logger = silentLogger();
  const report = await healModuleCollections(DEFS, {
    collectionsRepo: repo,
    ensureCollection: repo.ensureCollection,
    logger,
  });
  assert.deepEqual(report.added, ['neoai_beta']);
  assert.deepEqual(repo.created, ['neoai_beta'], 'die bestehende Sammlung wird NICHT angefasst');
  assert.equal(report.checked, 2);
});

test('NEGATIVKONTROLLE 1a — gesunder Boot: keine Sammlung angelegt, keine Zeile im Log', async () => {
  // Ohne sie bestuende dieser Test auch fuer einen Sweep, der bei jedem Start
  // jede Sammlung neu erzeugt — auf einer Installation mit mehreren Arbeitern
  // genau der gleichzeitige Schreibsturm, den der Zuschnitt vermeidet.
  const repo = makeCollectionsRepo(['neoai_alpha', 'neoai_beta']);
  const logger = silentLogger();
  const report = await healModuleCollections(DEFS, {
    collectionsRepo: repo,
    ensureCollection: repo.ensureCollection,
    logger,
  });
  assert.deepEqual(report.added, []);
  assert.equal(report.checked, 2, 'geprueft wurde trotzdem — Schweigen ist nicht Untaetigkeit');
  assert.deepEqual(repo.created, []);
  assert.deepEqual(logger.lines, []);
});

test('eine Sammlung, die ein anderer Arbeiter zuerst anlegt, ist Erfolg — kein Fehlschlag', async () => {
  const repo = makeCollectionsRepo([]);
  repo.ensureCollection = async () => {
    const err = new Error('duplicate key value violates unique constraint');
    err.code = '23505';
    throw err;
  };
  const report = await healModuleCollections([DEFS[0]], {
    collectionsRepo: repo,
    ensureCollection: repo.ensureCollection,
    logger: silentLogger(),
  });
  assert.deepEqual(report.raced, ['neoai_alpha']);
  assert.deepEqual(report.failed, []);
});

test('eine scheiternde Sammlung nimmt den Start NICHT herunter', async () => {
  const repo = makeCollectionsRepo([]);
  repo.ensureCollection = async () => {
    throw new Error('connection terminated unexpectedly');
  };
  const logger = silentLogger();
  const report = await healModuleCollections([DEFS[0]], {
    collectionsRepo: repo,
    ensureCollection: repo.ensureCollection,
    logger,
  });
  assert.deepEqual(report.failed, ['neoai_alpha']);
  assert.match(logger.lines.join('\n'), /boot is not blocked/);
});

test('ohne collections-Repository wird gewarnt statt geworfen', async () => {
  const logger = silentLogger();
  const report = await healModuleCollections(DEFS, {
    collectionsRepo: null,
    ensureCollection: async () => {},
    logger,
  });
  assert.equal(report.checked, 0);
  assert.match(logger.lines.join('\n'), /collections repository is unavailable/);
});

test('eine Sammlungsdefinition ohne Namen wird gemeldet und uebersprungen, nie geworfen', async () => {
  const repo = makeCollectionsRepo([]);
  const logger = silentLogger();
  const report = await healModuleCollections([{ titleField: 'x' }], {
    collectionsRepo: repo,
    ensureCollection: repo.ensureCollection,
    logger,
  });
  assert.deepEqual(report.failed, ['?']);
  assert.deepEqual(repo.created, []);
  assert.match(logger.lines.join('\n'), /without a name/);
});

// ---- ACHSE 2: das Feld ------------------------------------------------------

test('healExtraFields stellt genau das fehlende Feld bereit', async () => {
  const repo = makeFieldsRepo(['neoai_alpha.eins']);
  const logger = silentLogger();
  const report = await healExtraFields(FIELDS, {
    fieldsRepo: repo,
    ensureField: repo.ensureField,
    logger,
  });
  assert.deepEqual(report.added, ['neoai_alpha.zwei']);
  assert.deepEqual(repo.created, ['neoai_alpha.zwei'], 'ein bestehendes Feld wird NICHT erneut gesynct');
  assert.equal(report.checked, 2);
});

test('NEGATIVKONTROLLE 1b — gesunder Boot: kein Feld bereitgestellt, keine Zeile im Log', async () => {
  // Der teuerste Fehler waere hier nicht ein zusaetzlicher Schreibvorgang,
  // sondern der `alter`-Sync, den `ensureField` je Aufruf ausloest: ein
  // ALTER TABLE je Feld je Start je Arbeiter.
  const repo = makeFieldsRepo(['neoai_alpha.eins', 'neoai_alpha.zwei']);
  const logger = silentLogger();
  const report = await healExtraFields(FIELDS, {
    fieldsRepo: repo,
    ensureField: repo.ensureField,
    logger,
  });
  assert.deepEqual(report.added, []);
  assert.equal(report.checked, 2);
  assert.deepEqual(repo.created, []);
  assert.deepEqual(logger.lines, []);
});

test('ein Feld, das ein anderer Arbeiter zuerst bereitstellt, ist Erfolg — kein Fehlschlag', async () => {
  const repo = makeFieldsRepo([]);
  repo.ensureField = async () => {
    const err = new Error('column "zwei" of relation "neoai_alpha" already exists');
    err.code = '42701';
    throw err;
  };
  const report = await healExtraFields([FIELDS[0]], {
    fieldsRepo: repo,
    ensureField: repo.ensureField,
    logger: silentLogger(),
  });
  assert.deepEqual(report.raced, ['neoai_alpha.eins']);
  assert.deepEqual(report.failed, []);
});

test('ein scheiterndes Feld nimmt den Start NICHT herunter', async () => {
  const repo = makeFieldsRepo([]);
  repo.ensureField = async () => {
    throw new Error('connection terminated unexpectedly');
  };
  const logger = silentLogger();
  const report = await healExtraFields([FIELDS[0]], {
    fieldsRepo: repo,
    ensureField: repo.ensureField,
    logger,
  });
  assert.deepEqual(report.failed, ['neoai_alpha.eins']);
  assert.match(logger.lines.join('\n'), /boot is not blocked/);
});

test('ohne fields-Repository wird gewarnt statt geworfen', async () => {
  const logger = silentLogger();
  const report = await healExtraFields(FIELDS, { fieldsRepo: null, ensureField: async () => {}, logger });
  assert.equal(report.checked, 0);
  assert.match(logger.lines.join('\n'), /fields repository is unavailable/);
});

test('ein missgebildeter Feldeintrag wird gemeldet und uebersprungen, nie geworfen', async () => {
  const repo = makeFieldsRepo([]);
  const logger = silentLogger();
  const report = await healExtraFields([{ owner: 'core', collection: 'neoai_alpha' }], {
    fieldsRepo: repo,
    ensureField: repo.ensureField,
    logger,
  });
  assert.deepEqual(report.failed, ['neoai_alpha.?']);
  assert.deepEqual(repo.created, []);
  assert.match(logger.lines.join('\n'), /malformed field entry/);
});

// ---- Die Reihenfolge, die keine Geschmacksfrage ist --------------------------

test('SAMMLUNG vor FELD: ein Feld einer eben angelegten Sammlung wird danach bereitgestellt', async () => {
  // Andersherum haengte sich das Feld an eine Sammlung, die es noch nicht gibt.
  // Der Test bildet die Startreihenfolge aus plugin.ts nach.
  const colls = makeCollectionsRepo([]);
  const fields = makeFieldsRepo([]);
  const logger = silentLogger();

  const cReport = await healModuleCollections([DEFS[0]], {
    collectionsRepo: colls,
    ensureCollection: colls.ensureCollection,
    logger,
  });
  const fReport = await healExtraFields([FIELDS[0]], {
    fieldsRepo: fields,
    ensureField: fields.ensureField,
    logger,
  });

  assert.deepEqual(cReport.added, ['neoai_alpha']);
  assert.deepEqual(fReport.added, ['neoai_alpha.eins']);
  assert.ok(
    colls.known.has('neoai_alpha'),
    'die Sammlung muss stehen, bevor sich ein Feld an sie haengt',
  );
});

// ---- Der Zwangspunkt: das ECHTE Register, nicht eine gepflegte Teilmenge -----

/** Genau die Quellenliste, die plugin.ts an den Sweep uebergibt. */
const realSources = () => [
  { owner: 'core', collections: NEOAI_COLLECTIONS, extraFields: NEOAI_EXTRA_FIELDS },
];

/** Jedes deklarierte Feld dieses Plugins, unabhaengig vom Sweep aufgesammelt. */
function everyDeclaredFieldLabel() {
  const labels = new Set();
  for (const def of NEOAI_COLLECTIONS) {
    for (const f of def.fields ?? []) labels.add(`${def.name}.${f.name}`);
  }
  for (const e of NEOAI_EXTRA_FIELDS) labels.add(`${e.collection}.${e.field.name}`);
  return labels;
}

test('NEGATIVKONTROLLE 2 — das Inventar deckt JEDE deklarierte Sammlung und JEDES deklarierte Feld ab und ist nicht leer', () => {
  const inventory = collectDeclaredFields(realSources());
  const covered = new Set(inventory.map((e) => `${e.collection}.${e.field.name}`));
  const declared = everyDeclaredFieldLabel();

  // Der Boden gegen das leere gruene Gate: dieser Test darf nicht dadurch
  // bestehen, dass es nichts zu pruefen gibt. Am 2026-08-05 gemessen: 13
  // Sammlungen, 114 eindeutige Feldnamen. Sinkt eine der Zahlen, ist die
  // Abdeckung geschrumpft und der Grund gehoert angesehen, BEVOR der Boden
  // gesenkt wird.
  assert.ok(
    NEOAI_COLLECTIONS.length >= 13,
    `erwartet >=13 deklarierte Sammlungen, gemessen ${NEOAI_COLLECTIONS.length}`,
  );
  assert.ok(covered.size >= 114, `erwartet >=114 deklarierte Felder, gemessen ${covered.size}`);

  const missing = [...declared].filter((label) => !covered.has(label));
  assert.deepEqual(missing, [], 'jedes deklarierte Feld muss im Sweep landen, sonst fehlt es still');
  assert.equal(covered.size, declared.size);

  // Jeder Waechter druckt die ANZAHL des Geprueften: ein Exit-Code ohne Zahl ist
  // mit dem Exit-Code eines Waechters identisch, der nichts angesehen hat
  // ([[waechter-brauchen-einen-zwangspunkt]]).
  console.error(
    `[boot-schema-heal] Inventar geprueft: ${NEOAI_COLLECTIONS.length} Sammlungen · ` +
      `${covered.size} eindeutige Felder · ${inventory.length} Sweep-Eintraege · ` +
      `${NEOAI_EXTRA_FIELDS.length} davon aus NEOAI_EXTRA_FIELDS`,
  );
});

test('das Inventar fasst doppelt deklarierte Felder zusammen — ein Boot schlaegt sie nicht zweimal nach', () => {
  // 4 Felder sind heute inline UND in NEOAI_EXTRA_FIELDS deklariert.
  const inventory = collectDeclaredFields(realSources());
  const labels = inventory.map((e) => `${e.collection}.${e.field.name}`);
  assert.equal(new Set(labels).size, labels.length, `doppelte Eintraege im Sweep-Inventar: ${labels}`);

  const rawCount =
    NEOAI_COLLECTIONS.reduce((n, def) => n + (def.fields?.length ?? 0), 0) + NEOAI_EXTRA_FIELDS.length;
  assert.ok(
    rawCount > labels.length,
    'die Zusammenfassung muss ueberhaupt greifen — sonst prueft dieser Test nichts',
  );
});

test('jedes deklarierte Feld traegt einen Namen — der Sweep meldete es sonst als missgebildet', () => {
  const problems = [];
  for (const entry of collectDeclaredFields(realSources())) {
    if (!entry.field?.name) problems.push(`${entry.collection}: Feld ohne name`);
    if (!entry.collection) problems.push(`${entry.field?.name}: Eintrag ohne collection`);
  }
  assert.deepEqual(problems, []);
});

test('jede deklarierte Sammlung traegt einen Namen mit dem Praefix dieses Plugins', () => {
  // Das Praefix ist die Grundlage jeder Messung an der laufenden Installation
  // (`where name like 'neoai\\_%'`). Eine Sammlung ausserhalb faellt aus jeder
  // kuenftigen Bestandsaufnahme heraus, ohne dass es auffaellt.
  const fremd = NEOAI_COLLECTIONS.map((c) => c.name).filter((n) => !n?.startsWith('neoai_'));
  assert.deepEqual(fremd, []);
});

// ---- Die Verdrahtung --------------------------------------------------------
//
// plugin.ts importiert @nocobase/server und ist hier nicht einlesbar — die
// Verdrahtung wird deshalb am Quelltext festgenagelt. Ohne diese Tests waere die
// ganze Datei darueber totes Gewicht: ein Sweep, den niemand aufruft, ist kein
// Sweep ([[waechter-brauchen-einen-zwangspunkt]], Regel 1).

const pluginSource = readFileSync(new URL('../src/server/plugin.ts', import.meta.url), 'utf8');

/**
 * Die ANWEISUNGSzeilen von plugin.ts, kommentarbefreit.
 *
 * Gesucht wird die Anweisung, nie ihr blosses Vorkommen: die Erklaerkommentare
 * dieser Datei NENNEN sowohl die Sweep-Aufrufe als auch `detach('afterStart')`,
 * und ein Waechter, der darueber stolpert, zwingt dazu, genau die Kommentare zu
 * loeschen, die den Grund tragen ([[kommentar-entferner-in-waechtern]]).
 */
const statements = pluginSource
  .split('\n')
  .map((line, i) => ({ i, code: line.replace(/^\s*/, '') }))
  .filter((l) => !l.code.startsWith('//') && !l.code.startsWith('*') && !l.code.startsWith('/*'));
const lineOf = (needle) => statements.find((l) => l.code.includes(needle))?.i ?? -1;

test('plugin.ts ruft BEIDE neuen Sweeps beim Start auf', () => {
  assert.ok(lineOf('await this.healModuleCollectionsOnBoot();') > -1, 'Achse 1 wird nicht aufgerufen');
  assert.ok(lineOf('await this.healExtraFieldsOnBoot();') > -1, 'Achse 2 wird nicht aufgerufen');
  assert.match(pluginSource, /this\.app\.on\('afterStart'/);
});

test('die Reihenfolge SAMMLUNG -> FELD -> DEFINITION steht im Quelltext', () => {
  const iColl = lineOf('await this.healModuleCollectionsOnBoot();');
  const iField = lineOf('await this.healExtraFieldsOnBoot();');
  const iDef = lineOf('await this.healFieldDefinitionsOnBoot();');
  assert.ok(iColl < iField, 'ein Feld kann sich nur an eine BESTEHENDE Sammlung haengen');
  assert.ok(
    iField < iDef,
    'die Frage „steht in der Zeile noch das Richtige?" ist erst stellbar, wenn die Zeile existiert',
  );
});

test('alle drei Sweeps laufen VOR der ACL-Abloesung — sonst haengt ihr Schreibvorgang die Sammlung wieder an', () => {
  // `detach('afterStart')` muss das letzte Wort behalten: das Schreiben einer
  // Metadatenzeile haengt einen Sammlungsnamen hinter unserem Ruecken wieder an
  // `acl.strategyResources`. afterStart-Handler laufen in
  // REGISTRIERUNGSreihenfolge, also muss die Registrierung der Sweeps vor der
  // des Handlers stehen, der `detach('afterStart')` ruft.
  const iDetach = lineOf("detach('afterStart');");
  assert.ok(iDetach > -1, "detach('afterStart') muss als Anweisung vorkommen");
  for (const call of [
    'await this.healModuleCollectionsOnBoot();',
    'await this.healExtraFieldsOnBoot();',
    'await this.healFieldDefinitionsOnBoot();',
  ]) {
    assert.ok(lineOf(call) < iDetach, `${call} muss VOR detach('afterStart') registriert sein`);
  }
});

test('plugin.ts fuettert beide Sweeps aus dem ECHTEN Register, nicht aus einer Teilmenge', () => {
  // Achse 1 bekommt das Sammlungsregister unveraendert, Achse 2 das Ergebnis von
  // collectDeclaredFields ueber BEIDE Haelften des Vertrags. Eine handgepflegte
  // Liste an einer der beiden Stellen veraltet und meldete danach eine
  // Vollstaendigkeit, die sie nicht hat.
  assert.match(pluginSource, /healModuleCollections\(NEOAI_COLLECTIONS,/);
  assert.match(pluginSource, /collectDeclaredFields\(\[/);
  assert.match(
    pluginSource,
    /owner: 'core', collections: NEOAI_COLLECTIONS, extraFields: NEOAI_EXTRA_FIELDS/,
  );
});

test('ein gesunder Boot bleibt still — die Logzeilen haengen an einer nicht-leeren Bilanz', () => {
  // Der Beleg „zweiter Neustart heilt nichts mehr" ist eine NULL im Log. Er
  // traegt nur, solange die Zeilen nicht bedingungslos geschrieben werden.
  for (const marker of ['boot collection heal provisioned', 'boot schema heal provisioned']) {
    const i = statements.findIndex((l) => l.code.includes(marker));
    assert.ok(i > -1, `die Logzeile "${marker}" fehlt`);
    const guard = statements
      .slice(Math.max(0, i - 4), i)
      .map((l) => l.code)
      .join(' ');
    assert.match(
      guard,
      /if \(report\.added\.length\)/,
      `"${marker}" muss an report.added.length haengen, sonst schreibt auch ein gesunder Boot`,
    );
  }
});
