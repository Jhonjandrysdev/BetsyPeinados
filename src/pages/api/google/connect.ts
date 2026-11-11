import type { APIRoute } from 'astro';
import { authUrl, googleConfigured } from '../../../lib/google';
import { randomToken } from '../../../lib/crypto';

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (!googleConfigured()) return redirect('/admin/ajustes?error=' + encodeURIComponent('La conexión con Google aún no está lista. Pídele a quien te ayuda con la web que la active.'), 303);
  const state = randomToken(24);
  cookies.set('g_oauth_state', state, { httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax', path: '/api/google', maxAge: 600 });
  return redirect(authUrl(url.origin, state), 302);
};
