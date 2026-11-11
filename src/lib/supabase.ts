import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from 'astro:env/server';
import { getSecret } from 'astro:env/server';

const serviceKey = () => getSecret('SUPABASE_SERVICE_ROLE_KEY');
const serverKey = () => getSecret('SUPABASE_SERVER_KEY');

/** Configurado si hay URL + anon key y una forma de acceso de servidor (service_role o clave de servidor). */
export const supabaseConfigured = Boolean(
  PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY && (serviceKey() || serverKey()),
);

let admin: SupabaseClient | null = null;

/**
 * Cliente de servidor. SOLO se usa en el servidor; nunca se envía al navegador.
 * Usa service_role si existe; si no, la anon key + cabecera x-server-key, que las
 * políticas RLS (public.is_server()) validan contra un hash guardado en la base.
 */
export function supabaseAdmin(): SupabaseClient {
  if (!supabaseConfigured) throw new Error('Supabase no está configurado');
  const service = serviceKey();
  admin ??= service
    ? createClient(PUBLIC_SUPABASE_URL!, service, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-server-key': serverKey()! } },
      });
  return admin;
}

/** Cliente de sesión (cookies httpOnly) para el login del panel. */
export function supabaseAuth(request: Request, cookies: AstroCookies) {
  return createServerClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' }));
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          cookies.set(name, value, { ...options, path: '/', httpOnly: true, secure: import.meta.env.PROD, sameSite: 'lax' });
        }
      },
    },
  });
}

export function adminEmails(): string[] {
  return (getSecret('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function publicStorageUrl(path: string): string {
  return `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/galeria/${encodeURIComponent(path)}`;
}
