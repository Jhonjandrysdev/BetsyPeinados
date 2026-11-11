import { getSecret } from 'astro:env/server';

const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (buf: ArrayBuffer | Uint8Array) => Buffer.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf)).toString('base64url');
const unb64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

async function key(): Promise<CryptoKey> {
  const raw = getSecret('TOKEN_ENCRYPTION_KEY');
  if (!raw) throw new Error('Falta TOKEN_ENCRYPTION_KEY');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY debe ser de 32 bytes en base64');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** AES-256-GCM. Formato: v1.<iv>.<ciphertext> */
export async function encrypt(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), enc.encode(plain));
  return `v1.${b64(iv)}.${b64(ct)}`;
}

export async function decrypt(token: string): Promise<string> {
  const [v, iv, ct] = token.split('.');
  if (v !== 'v1' || !iv || !ct) throw new Error('Token cifrado inválido');
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(), unb64(ct));
  return dec.decode(pt);
}

export async function sha256(s: string): Promise<string> {
  return b64(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}

export function randomToken(bytes = 32): string {
  return b64(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Comparación en tiempo constante. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
