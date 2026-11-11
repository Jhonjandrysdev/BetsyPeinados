/**
 * Capa de datos. Usa Supabase cuando está configurado; si no, un modo demo en memoria
 * (solo para desarrollo/preview, con los mismos datos de ejemplo del SQL inicial).
 */
import { supabaseAdmin, supabaseConfigured, publicStorageUrl } from './supabase';
import type {
  Appointment,
  AppointmentStatus,
  BlockedDate,
  BusinessHour,
  GalleryImage,
  GoogleConnection,
  Service,
  SiteSettings,
} from './types';
import { DEFAULT_SETTINGS, DEFAULT_SERVICES, DEFAULT_HOURS } from './defaults';

export const demoMode = !supabaseConfigured;

// ───────────── Demo store (memoria del proceso) ─────────────
const demo = {
  settings: { ...DEFAULT_SETTINGS } as SiteSettings,
  services: DEFAULT_SERVICES.map((s) => ({ ...s })) as Service[],
  hours: DEFAULT_HOURS.map((h) => ({ ...h })) as BusinessHour[],
  blocked: [] as BlockedDate[],
  appointments: [] as Appointment[],
  google: null as GoogleConnection | null,
  rate: new Map<string, { start: number; hits: number }>(),
};

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    const err = new Error(res.error.message) as Error & { code?: string };
    err.code = res.error.code;
    throw err;
  }
  return res.data;
}

// ───────────── Ajustes ─────────────
export async function getSettings(): Promise<SiteSettings> {
  if (demoMode) return demo.settings;
  const data = check(await supabaseAdmin().from('site_settings').select('*').eq('id', 1).maybeSingle());
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}

export async function updateSettings(patch: Partial<SiteSettings>): Promise<void> {
  if (demoMode) {
    Object.assign(demo.settings, patch);
    return;
  }
  check(await supabaseAdmin().from('site_settings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', 1));
}

// ───────────── Servicios ─────────────
export async function getServices(onlyActive = true): Promise<Service[]> {
  if (demoMode) return demo.services.filter((s) => !onlyActive || s.active).sort((a, b) => a.sort - b.sort);
  let q = supabaseAdmin().from('services').select('*').order('sort').order('name');
  if (onlyActive) q = q.eq('active', true);
  return check(await q) as Service[];
}

export async function getService(id: string): Promise<Service | null> {
  if (demoMode) return demo.services.find((s) => s.id === id) ?? null;
  return check(await supabaseAdmin().from('services').select('*').eq('id', id).maybeSingle()) as Service | null;
}

export async function upsertService(s: Omit<Service, 'id'> & { id?: string }): Promise<void> {
  if (demoMode) {
    const i = demo.services.findIndex((x) => x.id === s.id);
    if (i >= 0) demo.services[i] = { ...demo.services[i], ...s } as Service;
    else demo.services.push({ ...s, id: crypto.randomUUID() } as Service);
    return;
  }
  if (s.id) check(await supabaseAdmin().from('services').update(s).eq('id', s.id));
  else {
    const { id: _ignored, ...rest } = s;
    check(await supabaseAdmin().from('services').insert(rest));
  }
}

export async function deleteService(id: string): Promise<void> {
  if (demoMode) {
    demo.services = demo.services.filter((s) => s.id !== id);
    return;
  }
  check(await supabaseAdmin().from('services').delete().eq('id', id));
}

// ───────────── Horario ─────────────
export async function getHours(): Promise<BusinessHour[]> {
  if (demoMode) return demo.hours;
  const rows = check(await supabaseAdmin().from('business_hours').select('*').order('weekday')) as BusinessHour[];
  return DEFAULT_HOURS.map((d) => rows.find((r) => r.weekday === d.weekday) ?? { ...d, enabled: false });
}

export async function saveHours(hours: BusinessHour[]): Promise<void> {
  if (demoMode) {
    demo.hours = hours;
    return;
  }
  check(await supabaseAdmin().from('business_hours').upsert(hours, { onConflict: 'weekday' }));
}

// ───────────── Días bloqueados ─────────────
export async function getBlockedDates(from?: string): Promise<BlockedDate[]> {
  if (demoMode) return demo.blocked.filter((b) => !from || b.day >= from).sort((a, b) => a.day.localeCompare(b.day));
  let q = supabaseAdmin().from('blocked_dates').select('*').order('day');
  if (from) q = q.gte('day', from);
  return check(await q) as BlockedDate[];
}

export async function addBlockedDate(day: string, reason: string): Promise<void> {
  if (demoMode) {
    if (!demo.blocked.some((b) => b.day === day)) demo.blocked.push({ id: crypto.randomUUID(), day, reason });
    return;
  }
  check(await supabaseAdmin().from('blocked_dates').upsert({ day, reason }, { onConflict: 'day' }));
}

export async function removeBlockedDate(id: string): Promise<void> {
  if (demoMode) {
    demo.blocked = demo.blocked.filter((b) => b.id !== id);
    return;
  }
  check(await supabaseAdmin().from('blocked_dates').delete().eq('id', id));
}

// ───────────── Citas ─────────────
export async function getAppointments(opts: { from: Date; to: Date; activeOnly?: boolean }): Promise<Appointment[]> {
  if (demoMode) {
    return demo.appointments
      .filter((a) => new Date(a.ends_at) > opts.from && new Date(a.starts_at) < opts.to)
      .filter((a) => !opts.activeOnly || a.status === 'pendiente' || a.status === 'confirmada')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }
  let q = supabaseAdmin()
    .from('appointments')
    .select('*')
    .lt('starts_at', opts.to.toISOString())
    .gt('ends_at', opts.from.toISOString())
    .order('starts_at');
  if (opts.activeOnly) q = q.in('status', ['pendiente', 'confirmada']);
  return check(await q) as Appointment[];
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  if (demoMode) return demo.appointments.find((a) => a.id === id) ?? null;
  return check(await supabaseAdmin().from('appointments').select('*').eq('id', id).maybeSingle()) as Appointment | null;
}

export class SlotTakenError extends Error {}

export async function createAppointment(
  a: Omit<Appointment, 'id' | 'created_at' | 'google_event_id'>,
): Promise<Appointment> {
  if (demoMode) {
    if (import.meta.env.PROD) throw new Error('Supabase no está configurado');
    const s = new Date(a.starts_at).getTime();
    const e = new Date(a.ends_at).getTime();
    const clash = demo.appointments.some(
      (x) =>
        (x.status === 'pendiente' || x.status === 'confirmada') &&
        new Date(x.starts_at).getTime() < e &&
        new Date(x.ends_at).getTime() > s,
    );
    if (clash) throw new SlotTakenError('Horario ocupado');
    const row: Appointment = { ...a, id: crypto.randomUUID(), created_at: new Date().toISOString(), google_event_id: null };
    demo.appointments.push(row);
    return row;
  }
  const res = await supabaseAdmin().from('appointments').insert(a).select('*').single();
  // 23P01 = exclusion_violation (cruce de horarios)
  if (res.error?.code === '23P01') throw new SlotTakenError('Horario ocupado');
  return check(res) as Appointment;
}

export async function updateAppointment(
  id: string,
  patch: Partial<Pick<Appointment, 'status' | 'google_event_id' | 'notes'>>,
): Promise<void> {
  if (demoMode) {
    const a = demo.appointments.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
    return;
  }
  check(await supabaseAdmin().from('appointments').update(patch).eq('id', id));
}

export type { AppointmentStatus };

// ───────────── Galería ─────────────
export async function getGallery(): Promise<GalleryImage[]> {
  if (demoMode) return [];
  const rows = check(await supabaseAdmin().from('gallery_images').select('*').order('sort').order('created_at', { ascending: false })) as Omit<GalleryImage, 'url'>[];
  return rows.map((r) => ({ ...r, url: publicStorageUrl(r.path) }));
}

export async function addGalleryImage(file: File, alt: string): Promise<void> {
  if (demoMode) throw new Error('Configura Supabase para subir fotos.');
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string, string>)[file.type];
  if (!ext) throw new Error('Formato no permitido');
  const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const sb = supabaseAdmin();
  check(await sb.storage.from('galeria').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false }));
  check(await sb.from('gallery_images').insert({ path, alt }));
}

export async function removeGalleryImage(id: string): Promise<void> {
  if (demoMode) return;
  const sb = supabaseAdmin();
  const row = check(await sb.from('gallery_images').select('path').eq('id', id).maybeSingle()) as { path: string } | null;
  if (!row) return;
  await sb.storage.from('galeria').remove([row.path]);
  check(await sb.from('gallery_images').delete().eq('id', id));
}

// ───────────── Google ─────────────
export async function getGoogleConnection(): Promise<GoogleConnection | null> {
  if (demoMode) return demo.google;
  return check(await supabaseAdmin().from('google_connection').select('*').eq('id', 1).maybeSingle()) as GoogleConnection | null;
}

export async function saveGoogleConnection(c: Omit<GoogleConnection, 'connected_at'>): Promise<void> {
  if (demoMode) {
    demo.google = { ...c, connected_at: new Date().toISOString() };
    return;
  }
  check(await supabaseAdmin().from('google_connection').upsert({ id: 1, ...c, connected_at: new Date().toISOString() }));
}

export async function deleteGoogleConnection(): Promise<void> {
  if (demoMode) {
    demo.google = null;
    return;
  }
  check(await supabaseAdmin().from('google_connection').delete().eq('id', 1));
}

// ───────────── Anti-spam ─────────────
export async function hitRateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  if (demoMode) {
    const now = Date.now();
    const r = demo.rate.get(key);
    if (!r || now - r.start > windowSeconds * 1000) {
      demo.rate.set(key, { start: now, hits: 1 });
      return true;
    }
    r.hits++;
    return r.hits <= max;
  }
  const { data, error } = await supabaseAdmin().rpc('hit_rate_limit', {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('rate limit error', error.message);
    return true; // no bloquear clientes reales si falla el contador
  }
  return data === true;
}
