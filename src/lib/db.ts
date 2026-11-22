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
  templates: {} as Record<string, string>,
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

/** Guarda ajustes; devuelve las columnas que no se pudieron guardar porque falta su migración. */
export async function updateSettings(patch: Partial<SiteSettings>): Promise<string[]> {
  if (demoMode) {
    Object.assign(demo.settings, patch);
    return [];
  }
  const omitidas: string[] = [];
  let row: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  let res = await supabaseAdmin().from('site_settings').update(row).eq('id', 1);
  // Si a la base le falta la columna de un ajuste nuevo (migración pendiente), guarda los demás igual.
  for (let i = 0; i < 3 && res.error?.code === 'PGRST204'; i++) {
    const col = Object.keys(row).find((k) => res.error?.message.includes(`'${k}'`));
    if (!col || col === 'updated_at') break;
    console.warn(`Falta la columna ${col} en site_settings: aplica las migraciones pendientes. Se guardan los demás ajustes.`);
    const { [col]: _omit, ...rest } = row;
    row = rest;
    omitidas.push(col);
    res = await supabaseAdmin().from('site_settings').update(row).eq('id', 1);
  }
  check(res);
  return omitidas;
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
  const save = async (row: typeof s) => {
    const { id: _ignored, ...rest } = row;
    return row.id ? supabaseAdmin().from('services').update(rest).eq('id', row.id) : supabaseAdmin().from('services').insert(rest);
  };
  let res = await save(s);
  // Si la base aún no tiene las columnas de precios por largo, guarda lo demás.
  if (res.error?.code === 'PGRST204') {
    const { price_short: _a, price_medium: _b, price_long: _c, extra_cm_price: _d, ...base } = s;
    res = await save(base);
  }
  check(res);
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

/** Varias citas por id en una sola consulta (las que no existan simplemente no vuelven). */
export async function getAppointmentsByIds(ids: string[]): Promise<Map<string, Appointment>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const rows = demoMode
    ? demo.appointments.filter((a) => unique.includes(a.id))
    : (check(await supabaseAdmin().from('appointments').select('*').in('id', unique)) as Appointment[]);
  return new Map(rows.map((a) => [a.id, a]));
}

export class SlotTakenError extends Error {}

export async function createAppointment(
  a: Omit<Appointment, 'id' | 'created_at' | 'google_event_id' | 'deposit_confirmed_at'>,
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
    const row: Appointment = { ...a, id: crypto.randomUUID(), created_at: new Date().toISOString(), google_event_id: null, deposit_confirmed_at: null };
    demo.appointments.push(row);
    return row;
  }
  const insert = (row: Partial<Appointment>) => supabaseAdmin().from('appointments').insert(row).select('*').single();
  // Si a la base le falta una migración (precio_en_cita o permiso_avisos), reserva igual sin esas columnas:
  // se quitan solo las que PostgREST dice que no existen, para no perder las demás.
  const OPCIONALES: Record<string, (keyof Appointment)[]> = { price: ['price', 'deposit'], deposit: ['price', 'deposit'], wa_opt_in: ['wa_opt_in'] };
  let row: Partial<Appointment> = a;
  let res = await insert(row);
  for (let i = 0; i < 2 && res.error?.code === 'PGRST204'; i++) {
    const col = Object.keys(OPCIONALES).find((c) => res.error?.message.includes(`'${c}'`));
    if (!col) break;
    console.warn(`Falta la columna ${col} en appointments: aplica las migraciones pendientes. La cita se guarda sin ella.`);
    row = Object.fromEntries(Object.entries(row).filter(([k]) => !OPCIONALES[col].includes(k as keyof Appointment)));
    res = await insert(row);
  }
  // 23P01 = exclusion_violation (cruce de horarios)
  if (res.error?.code === '23P01') throw new SlotTakenError('Horario ocupado');
  return check(res) as Appointment;
}

export async function updateAppointment(
  id: string,
  patch: Partial<
    Pick<
      Appointment,
      | 'status'
      | 'google_event_id'
      | 'notes'
      | 'deposit_confirmed_at'
      | 'receipt_path'
      | 'receipt_at'
      | 'notified'
      | 'price'
      | 'deposit'
      | 'travel_fee'
      | 'receipt_rejected_reason'
      | 'receipt_rejected_at'
      | 'cancel_reason'
      | 'starts_at'
      | 'ends_at'
      | 'client_confirmed_at'
      | 'change_requested_at'
      | 'rescheduled_at'
    >
  >,
): Promise<void> {
  if (demoMode) {
    const a = demo.appointments.find((x) => x.id === id);
    if (a) Object.assign(a, patch);
    return;
  }
  const res = await supabaseAdmin().from('appointments').update(patch).eq('id', id);
  // 23P01 = cruce con otra cita activa (al cambiar la hora)
  if (res.error?.code === '23P01') throw new SlotTakenError('Horario ocupado');
  check(res);
}

/** Actualiza solo si la cita sigue con ese comprobante (evita pisar uno que la clienta acaba de subir). */
export async function updateAppointmentIfReceipt(id: string, receiptPath: string, patch: Parameters<typeof updateAppointment>[1]): Promise<boolean> {
  if (demoMode) {
    const a = demo.appointments.find((x) => x.id === id);
    if (!a || a.receipt_path !== receiptPath) return false;
    Object.assign(a, patch);
    return true;
  }
  const rows = check(await supabaseAdmin().from('appointments').update(patch).eq('id', id).eq('receipt_path', receiptPath).select('id'));
  return (rows ?? []).length > 0;
}

/** Citas apartadas sin comprobante en revisión (candidatas a vencer). */
export async function listPendingWithoutReceipt(): Promise<Appointment[]> {
  if (demoMode) return demo.appointments.filter((a) => a.status === 'pendiente' && !a.receipt_path).map((a) => ({ ...a }));
  return check(await supabaseAdmin().from('appointments').select('*').eq('status', 'pendiente').is('receipt_path', null)) as Appointment[];
}

/** Cancela por falta de abono solo si la cita sigue apartada y sin comprobante. */
export async function expireIfUnpaid(id: string): Promise<boolean> {
  const patch = { status: 'cancelada' as const, cancel_reason: 'sin_abono' as const };
  if (demoMode) {
    const a = demo.appointments.find((x) => x.id === id);
    if (!a || a.status !== 'pendiente' || a.receipt_path) return false;
    Object.assign(a, patch);
    return true;
  }
  const rows = check(await supabaseAdmin().from('appointments').update(patch).eq('id', id).eq('status', 'pendiente').is('receipt_path', null).select('id'));
  return (rows ?? []).length > 0;
}

/** Todo lo que el dominio de la cita necesita de la base (ver CitaStore en cita.ts). */
export const citaStore = { getAppointment, updateAppointment, updateAppointmentIfReceipt, deleteReceipt, listPendingWithoutReceipt, expireIfUnpaid };

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

// ───────────── Pagos: QR y comprobantes ─────────────
const IMG_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };

/** Sube la imagen del QR de pagos (pública, en la galería) y devuelve su ruta. */
export async function uploadPayQr(file: File): Promise<string> {
  if (demoMode) throw new Error('Configura Supabase para subir el QR.');
  const ext = IMG_EXT[file.type];
  if (!ext || ext === 'pdf' || ext === 'heic') throw new Error('Formato no permitido');
  const path = `pago/qr-${Date.now()}.${ext}`;
  check(await supabaseAdmin().storage.from('galeria').upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false }));
  return path;
}

/**
 * Guarda el comprobante del abono en el bucket privado y lo asocia a la cita.
 * Devuelve false si la cita dejó de esperar abono mientras subía (p. ej. venció el plazo).
 */
export async function saveReceipt(a: Appointment, file: File): Promise<boolean> {
  const ext = IMG_EXT[file.type];
  if (!ext) throw new Error('Formato no permitido');
  const patch = { receipt_at: new Date().toISOString(), receipt_path: `${a.id}/${Date.now()}.${ext}` };
  if (demoMode) {
    const row = demo.appointments.find((x) => x.id === a.id);
    if (!row || row.status !== 'pendiente') return false;
    Object.assign(row, patch);
    return true;
  }
  check(await supabaseAdmin().storage.from('comprobantes').upload(patch.receipt_path, file, { contentType: file.type, upsert: false }));
  const rows = check(await supabaseAdmin().from('appointments').update(patch).eq('id', a.id).eq('status', 'pendiente').select('id'));
  if ((rows ?? []).length > 0) return true;
  await supabaseAdmin().storage.from('comprobantes').remove([patch.receipt_path]);
  return false;
}

/** Borra un comprobante del bucket privado (al rechazarlo). */
export async function deleteReceipt(path: string): Promise<void> {
  if (demoMode) return;
  check(await supabaseAdmin().storage.from('comprobantes').remove([path]));
}

/** Enlace temporal (10 min) para que Betsy vea el comprobante. */
export async function receiptUrl(path: string): Promise<string | null> {
  if (demoMode) return null;
  const { data } = await supabaseAdmin().storage.from('comprobantes').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

export async function markNotified(a: Appointment, ev: string): Promise<void> {
  const notified = { ...(a.notified ?? {}), [ev]: new Date().toISOString() };
  if (demoMode) {
    a.notified = notified;
    return;
  }
  check(await supabaseAdmin().from('appointments').update({ notified }).eq('id', a.id));
}

// ───────────── Plantillas de mensajes ─────────────
export async function getTemplates(): Promise<Record<string, string>> {
  if (demoMode) return { ...demo.templates };
  const { data, error } = await supabaseAdmin().from('message_templates').select('event, body');
  if (error) return {}; // la tabla aún no existe: se usan los mensajes por defecto
  return Object.fromEntries(((data ?? []) as { event: string; body: string }[]).filter((t) => t.body?.trim()).map((t) => [t.event, t.body]));
}

export async function saveTemplate(event: string, body: string): Promise<void> {
  if (demoMode) {
    demo.templates[event] = body;
    return;
  }
  check(await supabaseAdmin().from('message_templates').upsert({ event, body, updated_at: new Date().toISOString() }));
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
