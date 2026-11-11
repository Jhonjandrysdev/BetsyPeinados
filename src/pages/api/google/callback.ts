import type { APIRoute } from 'astro';
import { exchangeCode } from '../../../lib/google';
import { safeEqual } from '../../../lib/crypto';

const back = (kind: 'ok' | 'error', msg: string) =>
  new Response(null, { status: 303, headers: { Location: `/admin/ajustes?${kind}=${encodeURIComponent(msg)}` } });

export const GET: APIRoute = async ({ url, cookies }) => {
  const expected = cookies.get('g_oauth_state')?.value ?? '';
  cookies.delete('g_oauth_state', { path: '/api/google' });
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code');
  if (url.searchParams.get('error')) return back('error', 'Cancelaste la conexión con Google');
  if (!expected || !safeEqual(state, expected) || !code) return back('error', 'La conexión expiró, intenta de nuevo');
  try {
    const email = await exchangeCode(url.origin, code);
    return back('ok', `Google Calendar conectado${email ? ` (${email})` : ''}`);
  } catch (e) {
    console.error('Google OAuth', e);
    return back('error', 'No se pudo conectar con Google. Intenta de nuevo.');
  }
};
