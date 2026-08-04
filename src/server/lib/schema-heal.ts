// src/server/lib/schema-heal.ts
// -----------------------------------------------------------------------------
// DIE DRITTE ACHSE: die FELDDEFINITION, nicht ihre Existenz.
//
// Portiert aus @neomodul/crm (PR crm#166, `a2fb9d68`), wo die Falle gemessen und
// geschlossen wurde. Der Zuschnitt ist NICHT ungeprueft uebernommen — jede
// Entscheidung unten ist fuer DIESES Plugin nachgemessen worden; die Zahlen
// stehen an der jeweiligen Entscheidung.
//
// DER BEFUND
// ----------
// NocoBase liest Felddefinitionen zur LAUFZEIT aus der Tabelle `fields`, nicht
// aus dem Buendel. `ensureField()` in plugin.ts ist idempotent auf EXISTENZ:
// steht die Zeile, wird sie nie wieder angefasst. Eine geaenderte Auswahlliste
// (`uiSchema.enum`) erreicht eine BESTEHENDE Installation daher nie von selbst,
// und ein Neustart heilt nichts — bei crm gemessen, mit neu gestartetem
// Container und erneut gelesener Zeile.
//
//   => Auf einer installierten Instanz beschreibt das Buendel, was das Plugin
//      SAGEN WUERDE. Was die Installation SAGT, steht in `fields`.
//
// Damit ist auch die naheliegende Abnahme wertlos: `grep` im ausgelieferten
// `dist/server/index.js` meldete bei crm 0 Treffer, waehrend die Admin-Maske den
// toten Wert weiter anbot. Abgenommen wird an
// `GET /api/collections/<name>/fields:list`. Volle Ursachenkette:
// [[nocobase-neue-felder-brauchen-disable-enable]], Achse 3.
//
// WARUM NEOAI BETROFFEN IST (gemessen 2026-08-05, laufender Sandkasten)
// ----------------------------------------------------------------------
// Dieses Plugin provisioniert ueber `db.getRepository('collections')` /
// `('fields')` — den Collection-Manager-Pfad, genau wie crm. Gegenprobe an der
// laufenden Installation:
//
//   select count(*) from fields where "collectionName" like 'neoai\_%';  -> 245
//   GET /api/collections/neoai_runs/fields:list -> liefert 17 Felder, `status`
//     mit der gespeicherten Auswahlliste
//
// Zum Vergleich die Gegenprobe, die zeigt, dass die Falle NICHT jedes Plugin
// trifft: @neomodul/pdf-generator definiert seine Sammlungen ueber NocoBases
// eigenes `db.collection()` in `load()`. Es hat 0 Zeilen in `fields`, taucht in
// `collections:list` gar nicht auf, und seine Definitionen entstehen bei JEDEM
// Start neu aus dem Buendel. Dort gibt es keine persistierte Kopie, die
// einfrieren koennte — und deshalb dort auch keinen Sweep.
//
// WARUM BOOT-SWEEP UND KEINE FOERMLICHE MIGRATION
// -----------------------------------------------
// `pm enable` gegen ein bereits aktiviertes Plugin ist ein No-op, `afterEnable`
// feuert auf einem gewoehnlichen Deploy also nie. Eine Migration, die nur dort
// haengt, liefe ausgerechnet auf den Installationen NICHT, die den Rueckstand
// tragen. Dieses Repo hat aus demselben Grund null Migrationen.
//
// SICHERHEIT — dieselben drei Regeln wie die crm-Vorlage:
//   1. Der Sweep kann den Start nie anhalten. Er schluckt alles; ein kaputtes
//      Feld ist eine Warnung, die App startet trotzdem.
//   2. Er tut nichts, wenn nichts zu tun ist: ein Lesevorgang je deklarierter
//      Auswahlliste, sonst nichts — kein Schreibvorgang, keine Logzeile.
//   3. Er vertraegt gleichzeitig startende Arbeiter: wer das Rennen verliert,
//      hat Erfolg, nicht Fehlschlag (isDuplicateSchemaError).
//
// Nur loeschbares TypeScript (Typaliase + Annotationen), damit node:test diese
// Datei direkt einlesen kann — die Orchestrierung ist der pruefenswerte Teil und
// bleibt deshalb frei von NocoBase-Typen.

export type DeclaredFieldSource = {
  /** 'core' oder der Name des besitzenden Moduls — nur fuer Log/Report-Etiketten. */
  owner: string;
  /** Sammlungsdefinitionen, deren inline deklarierte `fields` diese Quelle mitbringt. */
  collections?: any[];
  /** Die `extraFields`-Haelfte des Vertrags. */
  extraFields?: Array<{ collection: string; field: any }>;
};

export type OptionListEntry = {
  owner: string;
  collection: string;
  name: string;
  /** Die deklarierte Auswahlliste — `uiSchema.enum` eines Select-Feldes. */
  options: any[];
};

export type DefinitionHealDeps = {
  /** Repository der Collection-Manager-Tabelle `fields`. */
  fieldsRepo: any;
  logger: { info: (msg: string) => void; warn: (msg: string) => void };
  /**
   * Ein korrigiertes Feld auf seiner Sammlung im Speicher neu registrieren,
   * damit ein LAUFENDER Prozess die neue Definition sofort ausliefert und nicht
   * erst der naechste. Optional: der Sweep ist auch ohne das richtig, der
   * Prozess behaelt dann bis zu seinem Ende seine veraltete Kopie. BEWUSST kein
   * Tabellen-Sync: eine Auswahlliste hat keine Spaltenform, es gibt nichts zu
   * ALTERn und keinen Grund, sich in einen ALTER-Sturm einzureihen.
   */
  reloadField?: (row: any) => Promise<void>;
};

export type DefinitionHealReport = {
  /** Deklarierte Auswahlfelder, die angesehen wurden. */
  checked: number;
  /** "sammlung.feld" je gespeicherter Definition, die dieser Sweep korrigiert hat. */
  healed: string[];
  /** Deklariert, aber noch ohne Metadatenzeile — nicht die Aufgabe dieses Sweeps. */
  unprovisioned: string[];
  /** Ein gleichzeitig startender Arbeiter hat zuerst geschrieben. */
  raced: string[];
  /** Echt fehlgeschlagen — protokolliert, nie geworfen. */
  failed: string[];
};

/**
 * Ist dieser Fehler nur „das hat schon jemand getan"? Deckt beide Haelften des
 * Rennens ab: die Metadatenzeile (Unique-Verletzung) und die physische
 * Spalte/den Index (duplicate column/table). Postgres-SQLSTATEs zuerst, die
 * Meldung als Rueckfall fuer Treiber, die den Fehler anders einpacken.
 *
 * Hier falsch zu liegen ist in genau einer Richtung billig: einen echten
 * Fehlschlag als Rennen zu werten stuft einen Fehler zu einer Infozeile herab
 * (der naechste Start versucht es ohnehin erneut), waehrend ein als Fehlschlag
 * gewertetes Rennen bei jedem Mehr-Arbeiter-Start Warnungen erzeugte.
 */
export function isDuplicateSchemaError(err: any): boolean {
  const code = String(
    err?.original?.code ?? err?.parent?.code ?? err?.cause?.code ?? err?.code ?? '',
  );
  // 42701 duplicate_column, 42P07 duplicate_table (Index), 23505 unique_violation
  if (code === '42701' || code === '42P07' || code === '23505') return true;
  const message = String(err?.message ?? '');
  return /already exists|duplicate key|duplicate column|SequelizeUniqueConstraintError/i.test(message);
}

/**
 * Jedes Feld einsammeln, das dieses Plugin DEKLARIERT und das eine Auswahlliste
 * traegt — aus beiden Haelften des Vertrags (die inline `fields` einer Sammlung
 * und die `extraFields`-Liste), ueber alle Quellen.
 *
 * Selbstpflegend by construction: es laeuft ueber das ECHTE Register, ein
 * morgen hinzugefuegtes Select-Feld ist also abgedeckt, ohne dass jemand daran
 * denken muss, es hier einzutragen. Das ist der ganze Punkt. Eine handgepflegte
 * Liste „Definitionen, die Heilung verdienen" veraltete exakt so, wie es die
 * Kommentare taten, die bei crm einen kommenden Gmail-Adapter versprachen
 * ([[waechter-brauchen-einen-zwangspunkt]]).
 */
export function collectDeclaredOptionLists(sources: DeclaredFieldSource[]): OptionListEntry[] {
  const entries: OptionListEntry[] = [];
  const push = (owner: string, collection: any, field: any) => {
    const options = field?.uiSchema?.enum;
    if (!collection || !field?.name || !Array.isArray(options)) return;
    entries.push({ owner, collection, name: field.name, options });
  };
  for (const source of sources ?? []) {
    const owner = source?.owner ?? 'unknown';
    for (const def of source?.collections ?? []) {
      for (const field of def?.fields ?? []) push(owner, def?.name, field);
    }
    for (const entry of source?.extraFields ?? []) push(owner, entry?.collection, entry?.field);
  }
  return entries;
}

/**
 * Erfuellt die GESPEICHERTE Auswahlliste noch die DEKLARIERTE?
 *
 * Bewusst asymmetrisch. Jeder Schluessel, den die Deklaration nennt, muss
 * stimmen — an der deklarierten Position und in der deklarierten Laenge; ein
 * Schluessel, den nur die gespeicherte Kopie traegt, wird ignoriert.
 *
 * NACHGEMESSEN FUER DIESES PLUGIN (2026-08-05, laufende Installation): von den
 * 6 gespeicherten Auswahllisten dieses Plugins traegt aktuell KEINE einen
 * Schluessel, den die Deklaration nicht nennt — ein symmetrischer Vergleich
 * schriebe hier also heute ebenfalls nichts. Die Asymmetrie ist damit nicht die
 * Zahl, die den Sweep rettet, sondern die Zusicherung, dass eine kuenftige
 * Anreicherung durch NocoBase ihn nicht in einen Schreibvorgang pro Feld pro
 * Start verwandelt. Sie bleibt deshalb, mit gemessener statt behaupteter
 * Begruendung.
 *
 * Reihenfolge und Laenge SIND Teil des Vergleichs: ein entfernter Wert (der bei
 * crm gemessene Fehler) und eine umsortierte Liste sind beide echte
 * Aenderungen dessen, was einem Bedienenden angeboten wird.
 */
export function optionListsAgree(declared: any, stored: any): boolean {
  if (!Array.isArray(declared) || !Array.isArray(stored)) return false;
  if (declared.length !== stored.length) return false;
  for (let i = 0; i < declared.length; i += 1) {
    const want = declared[i];
    const have = stored[i];
    if (want === null || typeof want !== 'object') {
      if (want !== have) return false;
      continue;
    }
    if (have === null || typeof have !== 'object') return false;
    for (const key of Object.keys(want)) {
      if (JSON.stringify(want[key]) !== JSON.stringify((have as any)[key])) return false;
    }
  }
  return true;
}

/** Die gespeicherte `uiSchema` einer `fields`-Zeile, in welcher Form das Repository sie auch liefert. */
function storedUiSchema(row: any): any {
  // NocoBases MagicAttributeModel loest get('uiSchema') auf options.uiSchema auf;
  // die Rueckfaelle decken Testdoubles und jedes Repository ab, das rohe Zeilen liefert.
  return row?.get?.('uiSchema') ?? row?.uiSchema ?? row?.get?.('options')?.uiSchema ?? row?.options?.uiSchema;
}

/**
 * Jede abgedriftete Auswahlliste auf ihre Deklaration zurueckziehen. Wirft nie.
 *
 * Der Schreibvorgang traegt die VOLLE uiSchema (gespeichert gespreizt,
 * deklarierte `enum` oben drauf) statt nur `enum`. NocoBases
 * MagicAttributeModel merged ein magisches Attribut zwar mit
 * `arrayMerge: overwrite`, sodass `{ enum }` allein heute funktionierte — aber
 * das ist ein ORM-Interna, und ein Sweep, dessen Richtigkeit daran haengt,
 * verwandelte eine kuenftige Upstream-Aenderung in eine still beschnittene
 * Felddefinition. Das Spreizen macht den Schreibvorgang unter Merge- UND unter
 * Ersetzungssemantik richtig.
 */
export async function healFieldDefinitions(
  entries: OptionListEntry[],
  deps: DefinitionHealDeps,
): Promise<DefinitionHealReport> {
  const report: DefinitionHealReport = { checked: 0, healed: [], unprovisioned: [], raced: [], failed: [] };
  if (!Array.isArray(entries) || !entries.length) return report;
  if (!deps?.fieldsRepo) {
    deps?.logger?.warn?.('[neoai] boot definition heal skipped: the fields repository is unavailable');
    return report;
  }

  for (const entry of entries) {
    const collection = entry?.collection;
    const name = entry?.name;
    if (!collection || !name || !Array.isArray(entry?.options)) {
      deps.logger.warn(
        `[neoai] boot definition heal: skipping a malformed entry from "${entry?.owner ?? 'unknown'}"`,
      );
      report.failed.push(`${collection ?? '?'}.${name ?? '?'}`);
      continue;
    }
    const label = `${collection}.${name}`;
    report.checked += 1;
    try {
      const row = await deps.fieldsRepo.findOne({ filter: { collectionName: collection, name } });
      if (!row) {
        // Nicht das Problem dieses Sweeps: eine fehlende Zeile provisioniert
        // setup() (install/afterEnable). Vermerkt, damit beides abgeglichen
        // werden kann, nie eine Warnung wert.
        report.unprovisioned.push(label);
        continue;
      }
      const ui = storedUiSchema(row);
      if (optionListsAgree(entry.options, ui?.enum)) continue; // gesunder Boot: kein Schreibvorgang, keine Zeile
      await deps.fieldsRepo.update({
        filter: { collectionName: collection, name },
        values: { uiSchema: { ...(ui && typeof ui === 'object' ? ui : {}), enum: entry.options } },
      });
      if (deps.reloadField) {
        const fresh = await deps.fieldsRepo.findOne({ filter: { collectionName: collection, name } });
        if (fresh) await deps.reloadField(fresh);
      }
      report.healed.push(label);
      // Bewusst laut: diese Zeile ist die EINZIGE Spur, dass eine Installation
      // eine Definition angeboten hat, die ihr eigener Code laengst
      // zurueckgezogen hatte — und ihr Ausbleiben beim naechsten Start ist der
      // Beleg, dass der Schreibvorgang gehalten hat.
      deps.logger.info(
        `[neoai] boot definition heal: ${entry.owner}/${label} option list was stale ` +
          `(${Array.isArray(ui?.enum) ? ui.enum.length : '?'} -> ${entry.options.length} values), ` +
          'rewritten from the declaration',
      );
    } catch (err: any) {
      if (isDuplicateSchemaError(err)) {
        report.raced.push(label);
        continue;
      }
      report.failed.push(label);
      deps.logger.warn(
        `[neoai] boot definition heal: ${entry.owner}/${label} failed (continuing, boot is not blocked): ${err?.stack || err}`,
      );
    }
  }
  return report;
}
