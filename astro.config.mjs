// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import { envField } from 'astro/config';

const SITE = process.env.PUBLIC_SITE_URL || 'https://betsypeinados.com';
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.PUBLIC_SUPABASE_URL || '').origin; } catch { return ''; }
})();

export default defineConfig({
  site: SITE,
  output: 'server',
  adapter: vercel({ maxDuration: 15 }),
  trailingSlash: 'never',
  integrations: [
    sitemap({
      customPages: [`${SITE}/`, `${SITE}/reservar`, `${SITE}/grados`, `${SITE}/quince`, `${SITE}/novias`, `${SITE}/privacidad`],
      filter: (page) => !page.includes('/admin') && !page.includes('/api/') && !page.includes('/reserva/'),
    }),
  ],
  security: {
    checkOrigin: true,
    csp: {
      directives: [
        "default-src 'self'",
        `img-src 'self' data: blob: ${SUPABASE_HOST}`.trim(),
        "font-src 'self'",
        `connect-src 'self' ${SUPABASE_HOST}`.trim(),
        "frame-src https://www.google.com https://maps.google.com",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        "manifest-src 'self'",
        "worker-src 'self'",
        "form-action 'self' https://accounts.google.com",
        'upgrade-insecure-requests',
      ],
    },
  },
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({ context: 'server', access: 'public', optional: true }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({ context: 'server', access: 'public', optional: true }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      SUPABASE_SERVER_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      ADMIN_EMAILS: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      TOKEN_ENCRYPTION_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      RATE_LIMIT_SALT: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
    validateSecrets: false,
  },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
