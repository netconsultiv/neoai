import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptSecret, deriveKey, encryptSecret } from '../src/server/lib/secrets.ts';

const ENV_A = { APP_KEY: 'test-app-key-aaaaaaaaaaaaaaaaaaaa' };
const ENV_B = { APP_KEY: 'a-completely-different-app-key-bbb' };

test('deriveKey throws when APP_KEY is unset', () => {
  assert.throws(() => deriveKey({}), /APP_KEY/);
});

test('deriveKey is deterministic for the same APP_KEY', () => {
  const k1 = deriveKey(ENV_A);
  const k2 = deriveKey(ENV_A);
  assert.equal(k1.equals(k2), true);
  assert.equal(k1.length, 32);
});

test('deriveKey differs across different APP_KEY values', () => {
  const k1 = deriveKey(ENV_A);
  const k2 = deriveKey(ENV_B);
  assert.equal(k1.equals(k2), false);
});

test('encrypt/decrypt round-trip returns the original plaintext', () => {
  const plain = 'sk-super-secret-token-12345';
  const stored = encryptSecret(plain, ENV_A);
  assert.equal(typeof stored, 'string');
  assert.equal(stored.split(':').length, 3); // iv:authTag:ciphertext
  const out = decryptSecret(stored, ENV_A);
  assert.equal(out, plain);
});

test('encrypt/decrypt round-trip handles empty and unicode strings', () => {
  for (const plain of ['', 'héllo wörld 🔐', '{"json":"looking string"}']) {
    const stored = encryptSecret(plain, ENV_A);
    assert.equal(decryptSecret(stored, ENV_A), plain);
  }
});

test('two encryptions of the same plaintext produce different ciphertext (random IV)', () => {
  const a = encryptSecret('same-value', ENV_A);
  const b = encryptSecret('same-value', ENV_A);
  assert.notEqual(a, b);
  assert.equal(decryptSecret(a, ENV_A), 'same-value');
  assert.equal(decryptSecret(b, ENV_A), 'same-value');
});

test('decrypting with the wrong key throws (auth tag mismatch)', () => {
  const stored = encryptSecret('sensitive-value', ENV_A);
  assert.throws(() => decryptSecret(stored, ENV_B));
});

test('decrypting a malformed stored value throws', () => {
  assert.throws(() => decryptSecret('not-the-right-format', ENV_A));
  assert.throws(() => decryptSecret('only:two', ENV_A));
});

test('decrypting a tampered ciphertext throws (GCM tamper-evidence)', () => {
  const stored = encryptSecret('another-secret', ENV_A);
  const [iv, tag, data] = stored.split(':');
  // Flip a byte in the ciphertext segment.
  const buf = Buffer.from(data, 'base64');
  buf[0] = buf[0] ^ 0xff;
  const tampered = [iv, tag, buf.toString('base64')].join(':');
  assert.throws(() => decryptSecret(tampered, ENV_A));
});
