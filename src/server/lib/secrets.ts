// src/server/lib/secrets.ts
// -----------------------------------------------------------------------------
// Real encryption-at-rest for the NeoAI secrets vault (item 13 — owner's
// explicit call: AES-256-GCM, not masking-only). Key derived from the same
// APP_KEY env var Konfigurator's protected export store already uses (same
// trust boundary, no new secret-management infra). Node's built-in `crypto`
// only — no new dependency.
//
// Stored format: `iv:authTag:ciphertext`, each segment base64. GCM's auth tag
// gives us tamper-evidence + wrong-key detection for free (decrypt throws).

import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';
const SALT = 'neoai-secrets-vault';
const IV_LEN = 12; // GCM standard nonce size

let cachedKey: { source: string; key: Buffer } | null = null;

/** Derive a 32-byte key from APP_KEY via scrypt. Throws if APP_KEY is unset. */
export function deriveKey(env: Record<string, string | undefined> = process.env): Buffer {
  const appKey = String(env.APP_KEY ?? '').trim();
  if (!appKey) throw new Error('secrets: APP_KEY is not set — cannot encrypt/decrypt');
  if (cachedKey && cachedKey.source === appKey) return cachedKey.key;
  const key = crypto.scryptSync(appKey, SALT, 32);
  cachedKey = { source: appKey, key };
  return key;
}

/** Encrypt a plaintext string. Returns `iv:authTag:ciphertext` (base64 segments). */
export function encryptSecret(plain: string, env: Record<string, string | undefined> = process.env): string {
  const key = deriveKey(env);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plain ?? ''), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/**
 * Decrypt a value produced by encryptSecret(). Throws on malformed input,
 * wrong key, or tampered ciphertext (GCM auth-tag mismatch) — callers that
 * want a "skip, don't crash" policy (executeRun's bulk decrypt) must catch.
 */
export function decryptSecret(stored: string, env: Record<string, string | undefined> = process.env): string {
  const key = deriveKey(env);
  const parts = String(stored ?? '').split(':');
  if (parts.length !== 3) throw new Error('secrets: malformed stored value');
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const ciphertext = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}
