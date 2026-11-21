/**
 * WhatsApp Business Cloud API (Meta) para Betsy Peinados.
 *
 * Reglas de WhatsApp: si la clienta escribió en las últimas 24 h se manda el texto libre de la
 * pestaña Mensajes (gratis); si no, la plantilla aprobada en Meta `betsy_<aviso>` (Meta cobra
 * cada una como mensaje de Utilidad). Todo lo que sale y entra queda en whatsapp_messages.
 *
 * Variables (Vercel → Settings → Environment Variables): WHATSAPP_TOKEN, WHATSAPP_PHONE_ID,
 * WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN; opcionales WHATSAPP_LANG (es_CO),
 * WHATSAPP_TEMPLATE_PREFIX (betsy_) y WHATSAPP_WABA_ID (para leer el costo real en Meta).
 * Si faltan, el panel sigue con el botón de wa.me de siempre.
 */
import { getSecret } from 'astro:env/server';
import { demoMode, getService, getSettings, getTemplates, markNotified } from './db';
import { supabaseAdmin } from './supabase';
import { safeEqual } from './crypto';
import { depositOf, priceFor } from './defaults';
import { DEFAULT_TEMPLATES, META_TEMPLATES, fillTemplate, valuesFor, type NoticeEvent } from './messages';
import type { Appointment, WaMessage, WaStatus } from './types';

const GRAPH = 'https://graph.facebook.com/v21.0';
const env = (k: string) => (getSecret(k) ?? '').trim();
// En modo demo (sin Supabase) nunca se envía a Meta: no habría dónde registrar los mensajes.
export const waConfigured = () => !demoMode && Boolean(env('WHATSAPP_TOKEN') && env('WHATSAPP_PHONE_ID'));
const lang = () => env('WHATSAPP_LANG') || 'es_CO';
const prefix = () => env('WHATSAPP_TEMPLATE_PREFIX') || 'betsy_';

/** Número en formato internacional, solo dígitos (Colombia por defecto). */
export const waNumber = (p: string) => {
  const d = (p ?? '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? `57${d}` : d;
};

export type SendResult =
  | { ok: true; kind: 'texto' | 'plantilla'; message?: WaMessage }
  | { ok: false; reason: 'not_configured' | 'window_closed' | 'error'; error?: string; message?: WaMessage };

/** Respuestas con botones que reconoce el webhook. */
export const BUTTON_CONFIRM = 'Confirmo';
export const BUTTON_CHANGE = 'Cambiar hora';

// ───────────── Base de datos ─────────────
export async function waMessagesFor(phone: string, limit = 60): Promise<WaMessage[]> {
  if (demoMode) return [];
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_messages')
    .select('*')
    .eq('phone', waNumber(phone))
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return []; // la tabla aún no existe
  return ((data ?? []) as WaMessage[]).reverse();
}

/** Mensajes de varias clientas a la vez (para los diálogos de la agenda). */
export async function waMessagesForPhones(phones: string[], perPhone = 40): Promise<Map<string, WaMessage[]>> {
  const out = new Map<string, WaMessage[]>();
  const list = [...new Set(phones.map(waNumber))].filter(Boolean);
  if (demoMode || !list.length) return out;
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_messages')
    .select('*')
    .in('phone', list)
    .order('created_at', { ascending: false })
    .limit(Math.min(1000, list.length * perPhone));
  if (error) return out;
  for (const m of (data ?? []) as WaMessage[]) {
    const arr = out.get(m.phone) ?? [];
    if (arr.length < perPhone) arr.unshift(m);
    out.set(m.phone, arr);
  }
  return out;
}

export async function lastInbound(phone: string): Promise<string | null> {
  if (demoMode) return null;
  const { data } = await supabaseAdmin()
    .from('whatsapp_messages')
    .select('created_at')
    .eq('phone', waNumber(phone))
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { created_at: string } | null)?.created_at ?? null;
}

/** ¿La clienta escribió en las últimas 24 h? (ventana de atención de WhatsApp) */
export const windowOpen = (last: string | null) => Boolean(last && Date.now() - new Date(last).getTime() < 24 * 3600_000 - 60_000);

async function saveMessage(row: Partial<WaMessage> & Pick<WaMessage, 'phone' | 'direction'>): Promise<WaMessage | undefined> {
  if (demoMode) return undefined;
  const { data, error } = await supabaseAdmin().from('whatsapp_messages').insert(row).select('*').single();
  if (error) console.error('whatsapp_messages', error.message);
  return (data as WaMessage | null) ?? undefined;
}

// ───────────── Meta ─────────────
async function sendToMeta(payload: Record<string, unknown>): Promise<string | undefined> {
  const r = await fetch(`${GRAPH}/${env('WHATSAPP_PHONE_ID')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await r.json().catch(() => ({}))) as { error?: { code?: number; message?: string; error_data?: { details?: string } }; messages?: { id: string }[] };
  if (!r.ok) {
    const e = data.error ?? {};
    const hint =
      e.code === 132001
        ? ' (la plantilla no existe o no está aprobada en Meta, o está en otro idioma)'
        : e.code === 131047
          ? ' (pasaron más de 24 h desde el último mensaje de la clienta)'
          : e.code === 190
            ? ' (el token de Meta venció o no es válido)'
            : e.code === 131026
              ? ' (ese número no tiene WhatsApp)'
              : e.code === 131030
                ? ' (con el número de prueba de Meta solo puedes escribir a números agregados en la lista de prueba)'
                : '';
    // Con pista conocida, se explica en español; si no, se deja el detalle de Meta como referencia técnica.
    const detail = e.error_data?.details || e.message || `Error ${r.status}`;
    throw new Error((hint ? `WhatsApp no aceptó el mensaje${hint}` : `WhatsApp no aceptó el mensaje (detalle de Meta: ${detail})`).slice(0, 480));
  }
  return data.messages?.[0]?.id;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Mensaje de texto libre o con botones (solo dentro de la ventana de 24 h). */
function freePayload(to: string, body: string, buttons?: string[]) {
  if (!buttons?.length) return { to, type: 'text', text: { body: clip(body, 4000), preview_url: false } };
  return {
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: clip(body, 1024) },
      action: { buttons: buttons.map((title, i) => ({ type: 'reply', reply: { id: `b${i}`, title: clip(title, 20) } })) },
    },
  };
}

async function deliver(a: Appointment | null, phone: string, event: string, body: string, kind: 'texto' | 'plantilla', payload: Record<string, unknown>): Promise<SendResult> {
  let waId: string | undefined;
  let error: string | null = null;
  try {
    waId = await sendToMeta(payload);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  const message = await saveMessage({
    appointment_id: a?.id ?? null,
    phone,
    direction: 'out',
    event,
    body: clip(body, 4000),
    kind,
    status: error ? 'fallido' : 'enviado',
    error,
    wa_message_id: waId ?? null,
  });
  if (error) return { ok: false, reason: 'error', error, message };
  return { ok: true, kind, message };
}

/** Datos de precio y abono de la cita, para llenar los mensajes. */
async function fillData(a: Appointment) {
  const [s, svc] = await Promise.all([getSettings(), a.service_id ? getService(a.service_id) : Promise.resolve(null)]);
  const exact = priceFor(svc ?? undefined, a.hair_length);
  const price = exact ?? svc?.price_from ?? null;
  return { a, s, price, deposit: exact ? depositOf(exact) : null };
}

/**
 * Envía el aviso de un momento de la cita. Dentro de la ventana de 24 h va el texto de Mensajes
 * (o el que Betsy ajustó); fuera de ella, la plantilla aprobada en Meta.
 */
export async function sendNotice(a: Appointment, event: NoticeEvent, customText = ''): Promise<SendResult> {
  if (!waConfigured()) return { ok: false, reason: 'not_configured' };
  const phone = waNumber(a.customer_phone);
  if (phone.length < 11) return { ok: false, reason: 'error', error: 'El WhatsApp de la clienta no parece válido.' };

  const data = await fillData(a);
  const meta = META_TEMPLATES[event];
  let result: SendResult;
  if (windowOpen(await lastInbound(phone))) {
    const body = customText.trim() || fillTemplate((await getTemplates())[event] ?? DEFAULT_TEMPLATES[event], data);
    result = await deliver(a, phone, event, body, 'texto', freePayload(phone, body, meta.buttons));
  } else {
    const params = meta.params(valuesFor(data)).map((t) => clip(String(t ?? '').replace(/\s+/g, ' ').trim() || '-', 200));
    const body = meta.text.replace(/\{\{(\d+)\}\}/g, (_, n) => params[Number(n) - 1] ?? '');
    result = await deliver(a, phone, event, body, 'plantilla', {
      to: phone,
      type: 'template',
      template: {
        name: `${prefix()}${event}`,
        language: { code: lang() },
        components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }],
      },
    });
  }
  if (result.ok) await markNotified(a, event).catch((e) => console.error(e));
  return result;
}

/** Respuesta libre de Betsy desde el panel (solo si la clienta escribió en las últimas 24 h). */
export async function sendFree(a: Appointment, text: string): Promise<SendResult> {
  if (!waConfigured()) return { ok: false, reason: 'not_configured' };
  const body = text.trim().slice(0, 4000);
  if (!body) return { ok: false, reason: 'error', error: 'Escribe el mensaje.' };
  const phone = waNumber(a.customer_phone);
  if (!windowOpen(await lastInbound(phone))) return { ok: false, reason: 'window_closed' };
  return deliver(a, phone, 'libre', body, 'texto', freePayload(phone, body));
}

/** Respuesta automática a un botón (la clienta acaba de escribir: siempre gratis). */
export async function autoReply(a: Appointment | null, phone: string, body: string): Promise<void> {
  if (!waConfigured()) return;
  await deliver(a, phone, 'auto', body, 'texto', freePayload(phone, body));
}

// ───────────── Webhook ─────────────
const RANK: Record<string, number> = { enviando: 0, enviado: 1, entregado: 2, leido: 3, fallido: 4 };
const META_STATUS: Record<string, WaStatus> = { sent: 'enviado', delivered: 'entregado', read: 'leido', failed: 'fallido' };

export async function validSignature(raw: string, header: string | null): Promise<boolean> {
  const secret = env('WHATSAPP_APP_SECRET');
  if (!secret || !header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
  return safeEqual(hex, header.slice(7));
}

/** Por qué no salió un mensaje, en palabras para Betsy. */
export function waErrorText(r: SendResult): string {
  if (r.ok) return '';
  if (r.reason === 'not_configured') return 'el WhatsApp automático no está conectado';
  if (r.reason === 'window_closed') return 'la clienta no te ha escrito en las últimas 24 horas';
  // Sin punto final: quien lo muestra decide cómo cerrar la frase.
  return (r.error ?? 'error desconocido').replace(/[.\s]+$/, '');
}

export const verifyToken = () => env('WHATSAPP_VERIFY_TOKEN');

/** Estado de un mensaje enviado (sin retroceder: un "leído" no vuelve a "entregado") y su cobro. */
export async function applyStatus(s: {
  id: string;
  status: string;
  errors?: { title?: string; error_data?: { details?: string } }[];
  pricing?: { billable?: boolean; category?: string };
}): Promise<void> {
  if (demoMode) return;
  const sb = supabaseAdmin();
  const { data: row } = await sb.from('whatsapp_messages').select('id, status, billable').eq('wa_message_id', s.id).maybeSingle();
  if (!row) return;
  const patch: Partial<WaMessage> = {};
  const next = META_STATUS[s.status];
  if (next && (RANK[row.status] ?? 0) < RANK[next]) {
    patch.status = next;
    if (next === 'fallido') patch.error = clip(s.errors?.[0]?.error_data?.details || s.errors?.[0]?.title || 'No se pudo entregar', 480);
  }
  if (s.pricing && typeof s.pricing.billable === 'boolean') {
    patch.billable = s.pricing.billable;
    patch.category = s.pricing.category ? clip(s.pricing.category, 30) : null;
  }
  if (Object.keys(patch).length) await sb.from('whatsapp_messages').update(patch).eq('id', row.id);
}

/** Cita del mensaje nuestro al que responde la clienta (botones del recordatorio). */
export async function appointmentForReply(waMessageId: string): Promise<Appointment | null> {
  if (demoMode) return null;
  const sb = supabaseAdmin();
  const { data: sent } = await sb.from('whatsapp_messages').select('appointment_id').eq('wa_message_id', waMessageId).maybeSingle();
  if (!sent?.appointment_id) return null;
  const { data } = await sb.from('appointments').select('*').eq('id', sent.appointment_id).maybeSingle();
  return (data as Appointment | null) ?? null;
}

/** Cita a la que pertenece un mensaje entrante: la próxima activa, si no la más reciente. */
export async function appointmentForPhone(phone: string): Promise<Appointment | null> {
  if (demoMode) return null;
  const variants = [phone, `+${phone}`];
  if (phone.startsWith('57') && phone.length === 12) variants.push(phone.slice(2));
  const sb = supabaseAdmin();
  const { data: upcoming } = await sb
    .from('appointments')
    .select('*')
    .in('customer_phone', variants)
    .in('status', ['pendiente', 'confirmada'])
    .gte('ends_at', new Date(Date.now() - 6 * 3600_000).toISOString())
    .order('starts_at')
    .limit(1)
    .maybeSingle();
  if (upcoming) return upcoming as Appointment;
  const { data: last } = await sb.from('appointments').select('*').in('customer_phone', variants).order('created_at', { ascending: false }).limit(1).maybeSingle();
  return (last as Appointment | null) ?? null;
}

export async function saveInbound(row: { appointment_id: string | null; phone: string; body: string; kind: string; wa_message_id: string; created_at: string }) {
  if (demoMode) return false;
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_messages')
    .upsert({ ...row, direction: 'in', status: 'recibido', body: clip(row.body, 4000) }, { onConflict: 'wa_message_id', ignoreDuplicates: true })
    .select('id');
  if (error) console.error('whatsapp inbound', error.message);
  return Boolean(data?.length); // false si Meta reenvió un mensaje que ya teníamos
}

// ───────────── Costos ─────────────
export interface MetaCost {
  usd: number;
  billable: number;
  byCategory: Record<string, { volume: number; cost: number }>;
}

/** Costo real que Meta reporta para la cuenta de WhatsApp de Betsy (necesita WHATSAPP_WABA_ID). */
export async function metaCost(from: Date, to: Date): Promise<MetaCost | { error: string } | null> {
  const waba = env('WHATSAPP_WABA_ID');
  if (!waba || !env('WHATSAPP_TOKEN')) return null;
  const start = Math.floor(from.getTime() / 1000);
  const end = Math.floor(Math.min(to.getTime(), Date.now()) / 1000);
  if (end <= start) return { usd: 0, billable: 0, byCategory: {} };
  const fields = `pricing_analytics.start(${start}).end(${end}).granularity(MONTHLY).dimensions(["PRICING_CATEGORY","PRICING_TYPE"])`;
  try {
    const r = await fetch(`${GRAPH}/${waba}?fields=${encodeURIComponent(fields)}`, {
      headers: { Authorization: `Bearer ${env('WHATSAPP_TOKEN')}` },
      signal: AbortSignal.timeout(6000),
    });
    const j = (await r.json().catch(() => ({}))) as {
      error?: { message?: string };
      pricing_analytics?: { data?: { data_points?: { pricing_category?: string; pricing_type?: string; volume?: number; cost?: number }[] }[] };
    };
    if (!r.ok) return { error: j.error?.message ?? `Error ${r.status}` };
    const out: MetaCost = { usd: 0, billable: 0, byCategory: {} };
    for (const p of j.pricing_analytics?.data?.flatMap((d) => d.data_points ?? []) ?? []) {
      const cat = (p.pricing_category ?? 'otro').toLowerCase();
      const c = (out.byCategory[cat] ??= { volume: 0, cost: 0 });
      c.volume += p.volume ?? 0;
      c.cost += p.cost ?? 0;
      out.usd += p.cost ?? 0;
      if (p.pricing_type === 'REGULAR') out.billable += p.volume ?? 0;
    }
    return out;
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function waMessagesBetween(from: Date, to: Date): Promise<WaMessage[] | null> {
  if (demoMode) return [];
  const { data, error } = await supabaseAdmin()
    .from('whatsapp_messages')
    .select('id, appointment_id, phone, direction, event, kind, status, billable, category, created_at, body, error, wa_message_id')
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .limit(5000);
  if (error) return null; // falta la migración
  return data as WaMessage[];
}
