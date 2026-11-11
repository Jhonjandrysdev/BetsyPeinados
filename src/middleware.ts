import { defineMiddleware } from 'astro:middleware';
import { adminEmails, supabaseAuth, supabaseConfigured } from './lib/supabase';

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Origin-Agent-Cluster': '?1',
};

const isAdminPath = (p: string) => p === '/admin' || p.startsWith('/admin/') || p.startsWith('/api/admin') || p.startsWith('/api/google');
const isPublicAdminPath = (p: string) => p === '/admin/login' || p === '/api/admin/login';

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  ctx.locals.user = null;

  if (isAdminPath(pathname)) {
    if (supabaseConfigured) {
      const sb = supabaseAuth(ctx.request, ctx.cookies);
      const { data } = await sb.auth.getUser();
      const email = data.user?.email?.toLowerCase();
      if (email && adminEmails().includes(email)) ctx.locals.user = { email };
    } else if (import.meta.env.DEV) {
      // Modo demo local sin Supabase: acceso libre SOLO en desarrollo.
      ctx.locals.user = { email: 'demo@local' };
    }

    if (!ctx.locals.user && !isPublicAdminPath(pathname)) {
      if (pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      return ctx.redirect('/admin/login', 303);
    }
  }

  const res = await next();

  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  if (isAdminPath(pathname) || pathname.startsWith('/reserva/') || pathname.startsWith('/api/')) {
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  // Nunca exponer la tecnología del servidor.
  res.headers.delete('X-Powered-By');
  return res;
});
