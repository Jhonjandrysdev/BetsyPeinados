// Importa fotos públicas de Instagram (URLs de CDN obtenidas por scraping) a la galería.
// Protegido con un token de un solo uso: solo se guarda su hash SHA-256.
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const TOKEN_HASH = 'b05aba793dc3a3961c596e18c6bec795267a899184c2714484f14a7f0d2f1887';

async function sha256(s: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    items?: { url: string; alt: string; key: string }[];
  } | null;
  if (!body?.token || (await sha256(body.token)) !== TOKEN_HASH) return new Response('forbidden', { status: 403 });

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const results: unknown[] = [];
  let sort = 0;
  for (const it of body.items ?? []) {
    sort++;
    try {
      const u = new URL(it.url);
      if (!/(cdninstagram\.com|fbcdn\.net)$/.test(u.hostname)) throw new Error('host');
      const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0', accept: 'image/*' } });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const type = r.headers.get('content-type') ?? '';
      if (!type.startsWith('image/jpeg') && !type.startsWith('image/webp')) throw new Error(`type ${type}`);
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.byteLength > 5 * 1024 * 1024) throw new Error('size');
      const path = `ig-${it.key}.jpg`;
      const up = await sb.storage.from('galeria').upload(path, buf, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: true });
      if (up.error) throw new Error(up.error.message);
      const ins = await sb.from('gallery_images').upsert({ path, alt: it.alt.slice(0, 160), sort }, { onConflict: 'path' });
      if (ins.error) throw new Error(ins.error.message);
      results.push({ key: it.key, ok: true, bytes: buf.byteLength });
    } catch (e) {
      results.push({ key: it.key, ok: false, error: (e as Error).message });
    }
  }
  return Response.json({ results });
});
