// Chiffrement applicatif AES-256-GCM des tests et solutions de r├®f├®rence (┬º9).
// La cl├® est fournie par ENCRYPTION_KEY (base64, 32 octets). En dev, une cl├®
// ├®ph├®m├¿re est g├®n├®r├®e si absente (les donn├®es chiffr├®es ne survivent pas).
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (raw) {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 32) return buf;
  }
  // Dev fallback ÔÇö ne jamais utiliser en production
  if (!process.env.ENCRYPTION_KEY_WARNED) {
    // eslint-disable-next-line no-console
    console.warn('[crypto] ENCRYPTION_KEY absente ou invalide ÔÇö cl├® ├®ph├®m├¿re (dev uniquement)');
    process.env.ENCRYPTION_KEY_WARNED = '1';
  }
  return randomBytes(32);
}

let cachedKey: Buffer | null = null;
function key(): Buffer {
  if (!cachedKey) cachedKey = getKey();
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function isEncrypted(value: string): boolean {
  // Heuristique : une valeur chiffr├®e est du base64 et d├®chiffre sans erreur.
  try {
    decrypt(value);
    return true;
  } catch {
    return false;
  }
}
