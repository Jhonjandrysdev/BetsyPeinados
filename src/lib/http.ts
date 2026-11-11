import { getSecret } from 'astro:env/server';
import { sha256 } from './crypto';
import { hitRateLimit } from './db';

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

/** IP del cliente anonimizada (hash con sal) para el contador anti-spam. Nunca guardamos la IP real. */
export async function clientKey(request: Request, clientAddress: string | undefined, scope: string): Promise<string> {
  const ip = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? clientAddress ?? 'unknown';
  return `${scope}:${(await sha256(`${getSecret('RATE_LIMIT_SALT') ?? 'betsy'}:${ip}`)).slice(0, 24)}`;
}

export async function limited(request: Request, clientAddress: string | undefined, scope: string, max: number, windowSeconds: number) {
  const key = await clientKey(request, clientAddress, scope);
  return !(await hitRateLimit(key, max, windowSeconds));
}

/** Límite por identificador arbitrario (p. ej. hash del correo), independiente de la IP. */
export async function limitedBy(id: string, scope: string, max: number, windowSeconds: number) {
  const key = `${scope}:${(await sha256(`${getSecret('RATE_LIMIT_SALT') ?? 'betsy'}:${id}`)).slice(0, 24)}`;
  return !(await hitRateLimit(key, max, windowSeconds));
}

/** Lee un cuerpo JSON pequeño; rechaza cuerpos grandes o de otro tipo. */
export async function readJson(request: Request, maxBytes = 8_000): Promise<unknown | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* ---------- Token de formulario anti-bots ----------
   Firma (HMAC-SHA256) la hora en que se mostró el formulario. Al enviarlo comprobamos
   que la firma sea auténtica y que haya pasado un tiempo mínimo humano. No guarda datos. */
const te = new TextEncoder();
async function hmacKey() {
  const secret = getSecret('RATE_LIMIT_SALT') ?? getSecret('TOKEN_ENCRYPTION_KEY') ?? 'betsy-form';
  return crypto.subtle.importKey('raw', te.encode(`form:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
async function sign(v: string) {
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), te.encode(v));
  return Buffer.from(new Uint8Array(sig)).toString('base64url').slice(0, 32);
}
export async function formToken(scope: string): Promise<string> {
  const ts = Date.now().toString(36);
  return `${ts}.${await sign(`${scope}:${ts}`)}`;
}
/** true si el token es auténtico y el formulario no se envió más rápido que `minMs`. */
export async function checkFormToken(token: unknown, scope: string, minMs = 2500): Promise<boolean> {
  if (typeof token !== 'string' || token.length > 80) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig) return false;
  const expected = await sign(`${scope}:${ts}`);
  if (expected.length !== sig.length) return false;
  let r = 0;
  for (let i = 0; i < sig.length; i++) r |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  if (r !== 0) return false;
  const age = Date.now() - Number.parseInt(ts, 36);
  return Number.isFinite(age) && age >= minMs && age < 30 * 86400_000;
}
