// test/gemini-key-im-tresor.test.mjs
// -----------------------------------------------------------------------------------------------
// BEFUND 5 DER ERSTMESSUNG, FESTGENAGELT (BÜNDEL BT, 2026-08-02, aus BÜNDEL BQ Punkt 10):
// `gemini_api_key` lag als blankes `varchar` in `neoai_settings`, während der AES-256-GCM-Tresor
// dieses Plugins (`src/server/lib/secrets.ts`, aus Bens ausdrücklicher Entscheidung „echte
// Verschlüsselung, nicht nur Maskierung") zwei Dateien weiter JEDEN `neoai_secrets`-Eintrag
// verschlüsselt. Ein Tresor, an dem der wichtigste Schlüssel des Plugins vorbeigelegt wird,
// schützt genau das nicht, wofür er gebaut wurde.
//
// WAS HIER AUSGEFÜHRT WIRD. `readVaultedSetting()` wird aus der TypeScript-Quelle gelöst und mit
// echten Eingaben aufgerufen — die ENTSCHEIDUNG (Klartext-Rückfall / entschlüsseln / manipuliert)
// ist das, was geprüft wird. Die Kryptografie selbst baut der Test als FIXTURE, und zwar aus den
// Konstanten, die er aus `secrets.ts` liest: ändert das Speicherformat dort, fällt dieser Test
// laut aus, statt an einer veralteten Annahme grün zu bleiben.
//
// Der SCHREIBweg wird an der Quelle geprüft — er lebt in einer Koa-Aktion, die ohne laufenden
// Server nicht aufrufbar ist, und dieses Repo committet keine `package-lock.json`, ist auf einem
// frischen Klon also uninstalliert.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const providers = readFileSync(join(ROOT, 'src/server/lib/providers.ts'), 'utf8');
const secrets = readFileSync(join(ROOT, 'src/server/lib/secrets.ts'), 'utf8');
const plugin = readFileSync(join(ROOT, 'src/server/plugin.ts'), 'utf8');

/** Das Speicherformat, GELESEN aus secrets.ts statt hier angenommen. */
const ALGO = secrets.match(/const ALGO = '([^']+)'/)?.[1];
const SALT = secrets.match(/const SALT = '([^']+)'/)?.[1];
const IV_LEN = Number(secrets.match(/const IV_LEN = (\d+)/)?.[1]);

test('das Speicherformat des Tresors ist noch das, das dieser Test nachbaut', () => {
  // Zählschranke: schlägt der Parse fehl, wären alle Fixtures unten Müll und die Prüfungen
  // trotzdem irgendwie grün oder rot — aus dem falschen Grund.
  assert.equal(ALGO, 'aes-256-gcm', 'der Algorithmus in secrets.ts hat sich geändert');
  assert.equal(SALT, 'neoai-secrets-vault', 'das Salz in secrets.ts hat sich geändert');
  assert.equal(IV_LEN, 12, 'die Nonce-Länge in secrets.ts hat sich geändert');
  assert.match(secrets, /iv\.toString\('base64'\), authTag\.toString\('base64'\), ciphertext\.toString\('base64'\)\]\.join\(':'\)/,
    'das Speicherformat `iv:authTag:ciphertext` hat sich geändert');
});

const APP_KEY = 'bt-testschluessel-nicht-echt';
function seal(plain) {
  const key = crypto.scryptSync(APP_KEY, SALT, 32);
  const iv = crypto.randomBytes(IV_LEN);
  const c = crypto.createCipheriv(ALGO, key, iv);
  const data = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

/** `readVaultedSetting` aus der Quelle, ausführbar. `decryptSecret` wird als echte, aus denselben
 *  Konstanten gebaute Entschlüsselung hereingereicht — nicht als Attrappe, die immer gelingt. */
function liftReadVaultedSetting() {
  const m = providers.match(/export function readVaultedSetting\(app: any, row: any, field: string\): string \{([\s\S]*?)\n\}/);
  assert.ok(m, 'readVaultedSetting() steht nicht (mehr) in providers.ts');
  const body = m[1].replace(/: any\b/g, '');
  const decryptSecret = (stored) => {
    const key = crypto.scryptSync(APP_KEY, SALT, 32);
    const [ivB64, tagB64, dataB64] = String(stored).split(':');
    const d = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    d.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([d.update(Buffer.from(dataB64, 'base64')), d.final()]).toString('utf8');
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('decryptSecret', `return function (app, row, field) {${body}\n};`);
  return fn(decryptSecret);
}

const appOf = () => { const warns = []; return { logger: { warn: (m) => warns.push(m) }, warns }; };
const rowOf = (v) => ({ get: (f) => (f === 'gemini_api_key' ? v : undefined) });

test('B5: ein verschlüsselt abgelegter Schlüssel kommt im Klartext zurück', () => {
  const read = liftReadVaultedSetting();
  const app = appOf();
  assert.equal(read(app, rowOf(seal('AIza-geheim-123')), 'gemini_api_key'), 'AIza-geheim-123');
  assert.deepEqual(app.warns, [], 'ein sauber geöffneter Wert darf nicht warnen');
});

test('B5: ein ALTER Klartextwert wird weitergereicht UND benannt — sonst ist der Commit ein Ausfall', () => {
  // Jede laufende Installation hat den Schlüssel heute im Klartext in der Zeile. Ein Lesepfad, der
  // nur noch entschlüsselt, macht die Fassung nach diesem Commit zu einem stillen Ausfall aller
  // Gemini-Aufrufe — kein Fehler, nur „kein Schlüssel konfiguriert".
  const read = liftReadVaultedSetting();
  const app = appOf();
  assert.equal(read(app, rowOf('AIza-alt-im-klartext'), 'gemini_api_key'), 'AIza-alt-im-klartext');
  assert.equal(app.warns.length, 1, 'der Klartext-Zustand wird nicht benannt');
  assert.match(app.warns[0], /KLARTEXT/, 'die Warnung sagt nicht, was los ist');
});

test('B5: ein manipulierter oder mit falschem Schlüssel geschriebener Wert kommt LEER zurück', () => {
  const read = liftReadVaultedSetting();
  const sealed = seal('AIza-geheim-123');
  const parts = sealed.split(':');
  // Ein Bit im Geheimtext kippen: der GCM-Auth-Tag muss das fangen.
  const data = Buffer.from(parts[2], 'base64'); data[0] ^= 0x01;
  const tampered = [parts[0], parts[1], data.toString('base64')].join(':');
  const app = appOf();
  assert.equal(read(app, rowOf(tampered), 'gemini_api_key'), '',
    'ein manipulierter Wert wird als Klartext durchgereicht — dann ist der Auth-Tag Zierde');
  assert.equal(app.warns.length, 1, 'die Manipulation wird nicht gemeldet');
});

test('B5: ein leeres Feld bleibt leer und warnt nicht — Negativkontrolle', () => {
  // Ohne diese Richtung wäre eine Funktion, die immer warnt, ebenfalls grün, und jede
  // Installation ohne eigenen Schlüssel bekäme bei jedem Lauf eine Falschmeldung ins Log.
  const read = liftReadVaultedSetting();
  for (const empty of ['', '   ', undefined, null]) {
    const app = appOf();
    assert.equal(read(app, rowOf(empty), 'gemini_api_key'), '');
    assert.deepEqual(app.warns, [], `ein leeres Feld (${JSON.stringify(empty)}) darf nicht warnen`);
  }
});

test('B5: der LESEweg der Auflösung geht wirklich über den Tresor', () => {
  assert.match(
    providers,
    /const k = readVaultedSetting\(app, own, 'gemini_api_key'\);/,
    'resolveGeminiKey() liest das Feld wieder roh — dann ist readVaultedSetting Zierde.',
  );
  assert.ok(
    !/String\(own\?\.get\?\.\('gemini_api_key'\) \?\? ''\)/.test(providers),
    'der alte Rohzugriff steht wieder da.',
  );
});

test('B5: der SCHREIBweg verschlüsselt — und fällt NICHT auf Klartext zurück', () => {
  assert.match(
    plugin,
    /values\.gemini_api_key = encryptSecret\(plain\);/,
    'saveSettings schreibt den Schlüssel wieder blank in die Zeile.',
  );
  const m = plugin.match(/if \(typeof p\.gemini_api_key === 'string'\) \{([\s\S]*?)\n          \}/);
  assert.ok(m, 'der Schreibweg hat seine Form geändert — diesen Test mitziehen');
  assert.match(
    m[1],
    /ctx\.throw\(500,/,
    'schlägt die Verschlüsselung fehl (APP_KEY nicht gesetzt), muss der Vorgang ABBRECHEN. Ein ' +
      'Klartext-Rückfall auf der SCHREIBseite wäre genau der Zustand, den diese Änderung beendet — ' +
      'anders als auf der Leseseite, wo der Rückfall Pflicht ist.',
  );
  assert.ok(
    !/values\.gemini_api_key = p\.gemini_api_key\.trim\(\);/.test(plugin),
    'der alte Klartext-Schreibweg steht wieder da.',
  );
});
