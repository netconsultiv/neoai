// test/log-schwaerzung.test.mjs
// -----------------------------------------------------------------------------------------------
// DIE SCHWÄRZUNG DES ANWENDUNGSPROTOKOLLS, AUSGEFÜHRT (Ticket „Schwärzungs-Middleware ohne
// Unit-Test", 2026-08-02; die Schaltung selbst kam mit PR #17 / BÜNDEL CH).
//
// WAS VORHER FEHLTE. Die Middleware mit der Marke `neoai-redact-secrets-from-log` war ausschließlich
// durch eine LAUFZEITMESSUNG belegt: PR #17 bewegte die Testzahl um 0. Nach einer Umbenennung, einem
// Neubau oder einem Refactor wäre sie lautlos zurückgefallen und kein Gate hätte es gemerkt
// ([[waechter-brauchen-einen-zwangspunkt]]).
//
// WARUM DIESER TEST DIE QUELLE HEBT STATT ZU IMPORTIEREN. Die Middleware ist eine anonyme
// Pfeilfunktion INNERHALB von `Plugin.beforeLoad()`; `plugin.ts` importiert `@nocobase/server` und
// zieht den halben Serverbaum nach. Dieses Repo committet keine `package-lock.json`, ist auf einem
// frischen Klon also uninstalliert — ein Import scheitert dort an der Umgebung, nicht an der Sache.
// Derselbe Weg wie in `gemini-key-im-tresor.test.mjs`: die Funktion wird aus dem Quelltext GELÖST
// und mit einer echten `ctx`-Attrappe AUSGEFÜHRT. Geprüft wird also Verhalten, nicht Wortlaut.
//
// DIE GEGENFALLE, gegen die hier ausdrücklich abgesichert wird: eine Hebung, die nichts findet, darf
// nicht zu einem grünen Lauf über null Prüfungen führen. Jede Hebung unten steht deshalb unter einem
// `assert.ok(...)`, und `test('die Hebung greift ...')` ist eine eigene Zählschranke.
//
// BEIDE RICHTUNGEN. Die Schwärzung ist AUSDRÜCKLICH gezielt und nicht pauschal gebaut: `value` und
// `gemini_api_key` verschwinden, `name` und die übrigen Felder BLEIBEN LESBAR — sonst wäre dem
// Protokoll nicht mehr zu entnehmen, welcher Eintrag überhaupt geschrieben wurde. Ein Test, der nur
// „irgendetwas ist geschwärzt" prüft, deckt die falsche Hälfte ab und wäre gegen eine pauschale
// Verschlechterung blind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const plugin = readFileSync(join(ROOT, 'src/server/plugin.ts'), 'utf8');

const TAG = 'neoai-redact-secrets-from-log';
const OPENER = 'this.app.resourceManager.use(async (ctx: any, next: any) => {';

/**
 * Löst den Rumpf der Middleware mit der Marke `tag` aus dem Quelltext.
 *
 * Gesucht wird von der MARKE aus rückwärts, nicht mit einem einzigen Ausdruck über die ganze Datei:
 * `plugin.ts` registriert mehrere Middlewares mit demselben Kopf, und ein Ausdruck von vorn würde
 * beim ERSTEN Kopf anfangen und alles dazwischen mitnehmen.
 */
function liftMiddlewareBody(source, tag) {
  const tagIdx = source.indexOf(`{ tag: '${tag}'`);
  assert.ok(tagIdx > 0, `keine Middleware mit der Marke '${tag}' in plugin.ts — wurde sie entfernt oder umbenannt?`);
  const head = source.slice(0, tagIdx);
  const openIdx = head.lastIndexOf(OPENER);
  assert.ok(
    openIdx > 0,
    `die Middleware '${tag}' hat ihre Form geändert (erwartet: \`${OPENER}\`) — diesen Test mitziehen`,
  );
  const closeIdx = head.lastIndexOf('}');
  assert.ok(closeIdx > openIdx, `der Rumpf von '${tag}' ließ sich nicht abgrenzen`);
  const body = head.slice(openIdx + OPENER.length, closeIdx);
  // Zählschranke gegen einen zu weit gefassten Schnitt: wäre eine zweite Registrierung mit
  // hineingerutscht, prüfte dieser Test etwas anderes als er behauptet.
  assert.ok(
    !body.includes('resourceManager.use('),
    'der gehobene Rumpf enthält eine weitere Middleware-Registrierung — der Schnitt ist zu weit',
  );
  assert.ok(body.trim().length > 0, `der Rumpf von '${tag}' ist leer`);
  return body;
}

/** Die Geheimnisliste aus dem Quelltext, nicht hier nachgebaut. */
function liftSecretParams(source) {
  const m = source.match(/const NEOAI_SECRET_PARAMS: Record<string, readonly string\[\]> = (\{[\s\S]*?\n {4}\});/);
  assert.ok(m, 'NEOAI_SECRET_PARAMS steht nicht (mehr) in plugin.ts');
  // eslint-disable-next-line no-new-func
  return new Function(`return ${m[1]};`)();
}

const SECRET_PARAMS = liftSecretParams(plugin);
const BODY = liftMiddlewareBody(plugin, TAG);
// eslint-disable-next-line no-new-func
const redact = new Function('NEOAI_SECRET_PARAMS', `return async function (ctx, next) {${BODY}\n};`)(SECRET_PARAMS);

/** Eine `ctx`-Attrappe in der Form, die NocoBases Antwort-Logger serialisiert. */
function ctxOf({ resourceName = 'neoai', actionName, values, body } = {}) {
  return {
    action: { resourceName, actionName, params: values === undefined ? {} : { values } },
    request: body === undefined ? {} : { body },
  };
}

/** `next` merkt sich, WAS DER HANDLER GESEHEN HAT — die Schwärzung darf erst danach greifen. */
function nextRecording(ctx, seen) {
  return async () => {
    seen.push(JSON.parse(JSON.stringify(ctx.action?.params?.values ?? null)));
  };
}

// ---------------------------------------------------------------------------------------------
// 0. Zählschranken: ohne diese wären alle Prüfungen unten grün, weil sie nichts ausführen.
// ---------------------------------------------------------------------------------------------

test('die Hebung greift: Middleware und Geheimnisliste sind gefunden und ausführbar', () => {
  assert.equal(typeof redact, 'function');
  assert.equal(redact.length, 2, 'die Middleware nimmt nicht mehr (ctx, next)');
  assert.ok(BODY.includes('await next()'), 'der gehobene Rumpf ruft `next()` gar nicht auf');
  assert.deepEqual(
    Object.keys(SECRET_PARAMS).sort(),
    ['saveSettings', 'secretsSave'],
    'die Geheimnisliste deckt andere Aktionen ab als dieser Test annimmt — beides mitziehen',
  );
  assert.deepEqual([...SECRET_PARAMS.secretsSave], ['value']);
  assert.deepEqual([...SECRET_PARAMS.saveSettings], ['gemini_api_key']);
});

test('die Middleware hängt hinter der ACL — sonst sieht sie die Aktion nicht', () => {
  // `before` sähe weder `ctx.state.currentRoles` noch eine fertig aufgelöste Aktion; und ohne
  // Registrierung ist der ganze Rumpf oben Zierde.
  assert.match(
    plugin,
    new RegExp(`\\{ tag: '${TAG}', after: 'acl' \\}`),
    `die Registrierung von '${TAG}' hat ihre Einhängung verloren`,
  );
});

// ---------------------------------------------------------------------------------------------
// 1. secretsSave — die Richtung „Geheimnis verschwindet"
// ---------------------------------------------------------------------------------------------

test('secretsSave: der Geheimniswert steht nach dem Lauf als [redacted] im Protokollobjekt', async () => {
  const ctx = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe', value: 'CH-NEOAI-PLAINTEXT-CCC' } });
  const seen = [];
  await redact(ctx, nextRecording(ctx, seen));
  assert.equal(ctx.action.params.values.value, '[redacted]', 'der Klartext steht noch im Protokollobjekt');
});

test('secretsSave: `name` BLEIBT LESBAR — die Schwärzung ist gezielt, nicht pauschal', async () => {
  // Ohne diese Richtung wäre ein `values = {}` oder ein pauschales Überschreiben aller Felder
  // ebenfalls grün, und dem Protokoll wäre nicht mehr zu entnehmen, WELCHER Eintrag geschrieben
  // wurde. Der Quelltext sagt das ausdrücklich zu; hier wird es gemessen.
  const ctx = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe', value: 'CH-NEOAI-PLAINTEXT-CCC' } });
  await redact(ctx, async () => {});
  assert.equal(ctx.action.params.values.name, 'ch-probe', '`name` ist kein Geheimnis und darf nicht verschwinden');
});

test('secretsSave: der Handler sieht den ECHTEN Wert — geschwärzt wird erst danach', async () => {
  // Das ist der Grund für `await next()` an erster Stelle. Vertauscht schriebe der Handler
  // „[redacted]" in den Tresor, und das Geheimnis wäre nicht geschützt, sondern zerstört.
  const ctx = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe', value: 'CH-NEOAI-PLAINTEXT-CCC' } });
  const seen = [];
  await redact(ctx, nextRecording(ctx, seen));
  assert.equal(seen.length, 1, 'die Middleware hat den Handler gar nicht aufgerufen');
  assert.equal(seen[0].value, 'CH-NEOAI-PLAINTEXT-CCC', 'der Handler bekam bereits den geschwärzten Wert');
});

test('secretsSave: der Klartext überlebt nirgends in dem, was der Logger serialisiert', async () => {
  // Die eigentliche Zusicherung, in der Form, in der der Schaden entstand: NocoBases Antwort-Logger
  // serialisiert `ctx.action` wörtlich. Diese Prüfung ist unabhängig davon, WELCHES Feld die
  // Middleware anfasst — ein zweiter Klartextpfad in derselben Aktion fiele hier auf.
  const marker = 'CH-NEOAI-PLAINTEXT-CCC';
  const ctx = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe', value: marker } });
  await redact(ctx, async () => {});
  assert.ok(!JSON.stringify(ctx.action).includes(marker), 'der Klartext steht noch in ctx.action');
});

// ---------------------------------------------------------------------------------------------
// 2. saveSettings — dieselbe Zusicherung für den zweiten Weg (BEFUND 5, BÜNDEL BT)
// ---------------------------------------------------------------------------------------------

test('saveSettings: der Gemini-Schlüssel wird geschwärzt, die übrigen Einstellungen bleiben lesbar', async () => {
  const ctx = ctxOf({
    actionName: 'saveSettings',
    values: { gemini_api_key: 'AIza-CH-GEHEIM-999', model: 'gemini-2.5-flash', monthly_budget_eur: 42 },
  });
  await redact(ctx, async () => {});
  assert.equal(ctx.action.params.values.gemini_api_key, '[redacted]');
  assert.equal(ctx.action.params.values.model, 'gemini-2.5-flash', 'das Modell ist kein Geheimnis');
  assert.equal(ctx.action.params.values.monthly_budget_eur, 42, 'das Budget ist kein Geheimnis');
  assert.ok(!JSON.stringify(ctx.action).includes('AIza-CH-GEHEIM-999'));
});

// ---------------------------------------------------------------------------------------------
// 3. Der zweite Beutel: `ctx.request.body`
// ---------------------------------------------------------------------------------------------

test('auch ctx.request.body wird geschwärzt — der Logger liest beide Beutel', async () => {
  const ctx = ctxOf({
    actionName: 'secretsSave',
    values: { name: 'ch-probe', value: 'IM-PARAMS' },
    body: { name: 'ch-probe', value: 'IM-BODY' },
  });
  await redact(ctx, async () => {});
  assert.equal(ctx.request.body.value, '[redacted]', 'der Rohrumpf der Anfrage trägt den Klartext weiter');
  assert.equal(ctx.request.body.name, 'ch-probe');
});

// ---------------------------------------------------------------------------------------------
// 4. Was NICHT angefasst werden darf
// ---------------------------------------------------------------------------------------------

test('ein abwesendes, leeres oder null-Feld wird NICHT zu [redacted]', async () => {
  // Sonst behauptete das Protokoll einen Schreibvorgang, den es nie gab — der Quelltext nennt
  // genau diesen Grund.
  for (const value of [undefined, null, '']) {
    const ctx = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe', value } });
    await redact(ctx, async () => {});
    assert.equal(
      ctx.action.params.values.value,
      value,
      `ein Feld mit ${JSON.stringify(value)} wurde zu einer Schreibbehauptung gemacht`,
    );
  }
  const leer = ctxOf({ actionName: 'secretsSave', values: { name: 'ch-probe' } });
  await redact(leer, async () => {});
  assert.equal('value' in leer.action.params.values, false, 'ein nie mitgeschicktes Feld wurde erfunden');
});

test('eine Aktion ohne Geheimnisse bleibt unberührt', async () => {
  const ctx = ctxOf({ actionName: 'secretsList', values: { name: 'ch-probe', value: 'NICHT-ANFASSEN' } });
  await redact(ctx, async () => {});
  assert.equal(ctx.action.params.values.value, 'NICHT-ANFASSEN');
});

test('eine fremde Ressource bleibt unberührt — diese Middleware gehört neoai', async () => {
  // crm hat seine eigene Schaltung (`crm-config-redact-secrets-from-log`) mit einer eigenen Liste.
  // Griffe diese hier auch dort zu, schwärzte sie nach der FALSCHEN Liste.
  const ctx = ctxOf({ resourceName: 'crm_settings', actionName: 'secretsSave', values: { value: 'NICHT-ANFASSEN' } });
  await redact(ctx, async () => {});
  assert.equal(ctx.action.params.values.value, 'NICHT-ANFASSEN');
});

// ---------------------------------------------------------------------------------------------
// 5. Protokollhygiene darf niemals eine erfolgreiche Anfrage scheitern lassen
// ---------------------------------------------------------------------------------------------

test('eine kaputte ctx-Form lässt die Anfrage nicht scheitern', async () => {
  for (const ctx of [{}, { action: null }, { action: { resourceName: 'neoai' } }, ctxOf({ actionName: 'secretsSave', values: null })]) {
    let called = 0;
    await redact(ctx, async () => { called += 1; });
    assert.equal(called, 1, 'der Handler wurde nicht aufgerufen');
  }
});

test('ein Fehler aus dem Handler wird NICHT verschluckt', async () => {
  // Die Gegenrichtung zum `catch` oben: der `try` umschließt nur die Schwärzung. Verschluckte die
  // Middleware auch Handler-Fehler, verwandelte sie jeden 500er in ein stilles 200.
  const ctx = ctxOf({ actionName: 'secretsSave', values: { value: 'x' } });
  await assert.rejects(
    () => redact(ctx, async () => { throw new Error('handler-fehler'); }),
    /handler-fehler/,
  );
});
