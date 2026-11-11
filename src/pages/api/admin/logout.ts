import type { APIRoute } from 'astro';
import { supabaseAuth, supabaseConfigured } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request, cookies, url }) => {
  if (supabaseConfigured) await supabaseAuth(request, cookies).auth.signOut();
  const motivo = url.searchParams.get('motivo') === 'inactividad' ? '?motivo=inactividad' : '';
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/admin/login${motivo}`,
      // Borra del navegador cualquier copia en caché del panel (datos de clientas).
      'Clear-Site-Data': '"cache"',
      'Cache-Control': 'no-store',
    },
  });
};
