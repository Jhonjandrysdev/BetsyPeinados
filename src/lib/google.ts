/**
 * Integración con Google Calendar vía OAuth 2.0 (sin dependencias extra).
 * Betsy conecta su cuenta una vez desde /admin/ajustes; guardamos el refresh token cifrado.
 */
import { getSecret } from 'astro:env/server';
import { decrypt, encrypt } from './crypto';
import { getGoogleConnection, saveGoogleConnection } from './db';
import type { Appointment, SiteSettings } from './types';
import { TZ } from './time';

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

export const googleConfigured = () => Boolean(getSecret('GOOGLE_CLIENT_ID') && getSecret('GOOGLE_CLIENT_SECRET') && getSecret('TOKEN_ENCRYPTION_KEY'));

export function redirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

export function authUrl(origin: string, state: string): string {
  const p = new URLSearchParams({
    client_id: getSecret('GOOGLE_CLIENT_ID')!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(origin: string, code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getSecret('GOOGLE_CLIENT_ID')!,
      client_secret: getSecret('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: redirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status}`);
  const json = (await res.json()) as { refresh_token?: string; access_token: string; id_token?: string };
  if (!json.refresh_token) throw new Error('Google no devolvió refresh_token');

  let email: string | null = null;
  const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${json.access_token}` },
  });
  if (info.ok) email = ((await info.json()) as { email?: string }).email ?? null;

  await saveGoogleConnection({
    google_email: email,
    refresh_token_enc: await encrypt(json.refresh_token),
    calendar_id: 'primary',
  });
  return email;
}

let cached: { token: string; exp: number } | null = null;

async function accessToken(): Promise<{ token: string; calendarId: string } | null> {
  if (!googleConfigured()) return null;
  const conn = await getGoogleConnection();
  if (!conn) return null;
  if (cached && cached.exp > Date.now() + 60_000) return { token: cached.token, calendarId: conn.calendar_id };

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getSecret('GOOGLE_CLIENT_ID')!,
      client_secret: getSecret('GOOGLE_CLIENT_SECRET')!,
      refresh_token: await decrypt(conn.refresh_token_enc),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google refresh: ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return { token: json.access_token, calendarId: conn.calendar_id };
}

export function clearGoogleCache() {
  cached = null;
}

async function gfetch(path: string, init: RequestInit = {}) {
  const at = await accessToken();
  if (!at) return null;
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path.replace('{cal}', encodeURIComponent(at.calendarId))}`, {
    ...init,
    headers: { Authorization: `Bearer ${at.token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google Calendar ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.status === 204 || res.status === 410 || res.status === 404 ? {} : res.json();
}

/** Bloques ocupados en el calendario de Betsy (eventos personales incluidos). */
export async function googleBusy(from: Date, to: Date): Promise<{ start: number; end: number }[]> {
  const at = await accessToken();
  if (!at) return [];
  const json = (await gfetch('/freeBusy', {
    method: 'POST',
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ, items: [{ id: at.calendarId }] }),
  })) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> } | null;
  const busy = Object.values(json?.calendars ?? {})[0]?.busy ?? [];
  return busy.map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

/** Crea el evento de la cita en Google Calendar. Devuelve el id del evento o null si no hay conexión. */
export async function createCalendarEvent(a: Appointment, s: SiteSettings): Promise<string | null> {
  const description = [
    `Servicio: ${a.service_name}`,
    `Clienta: ${a.customer_name}`,
    `WhatsApp: +${a.customer_phone.replace(/^\+/, '')} · https://wa.me/${a.customer_phone.replace(/\D/g, '')}`,
    a.customer_email ? `Correo: ${a.customer_email}` : '',
    a.notes ? `Notas: ${a.notes}` : '',
    '',
    `Agendado desde ${s.business_name} (${a.source === 'web' ? 'sitio web' : 'panel'})`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  const body: Record<string, unknown> = {
    summary: `💇‍♀️ ${a.service_name} · ${a.customer_name}`,
    description,
    location: s.address,
    start: { dateTime: a.starts_at, timeZone: TZ },
    end: { dateTime: a.ends_at, timeZone: TZ },
    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }, { method: 'popup', minutes: 1440 }] },
    extendedProperties: { private: { appointmentId: a.id } },
  };
  const send = a.customer_email ? 'all' : 'none';
  if (a.customer_email) body.attendees = [{ email: a.customer_email, displayName: a.customer_name }];

  const json = (await gfetch(`/calendars/{cal}/events?sendUpdates=${send}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })) as { id?: string } | null;
  return json?.id ?? null;
}

export async function cancelCalendarEvent(eventId: string, notify: boolean): Promise<void> {
  await gfetch(`/calendars/{cal}/events/${encodeURIComponent(eventId)}?sendUpdates=${notify ? 'all' : 'none'}`, { method: 'DELETE' });
}

export async function revokeGoogle(): Promise<void> {
  const conn = await getGoogleConnection();
  if (!conn) return;
  try {
    const token = await decrypt(conn.refresh_token_enc);
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' });
  } catch {
    /* ignorar */
  }
  clearGoogleCache();
}
