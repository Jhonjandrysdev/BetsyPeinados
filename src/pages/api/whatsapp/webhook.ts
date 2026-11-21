import type { APIRoute } from 'astro';
import { updateAppointment } from '../../../lib/db';
import { prettyDate, prettyTime } from '../../../lib/time';
import { safeEqual } from '../../../lib/crypto';
import {
  BUTTON_CHANGE,
  BUTTON_CONFIRM,
  appointmentForPhone,
  appointmentForReply,
  applyStatus,
  autoReply,
  saveInbound,
  validSignature,
  verifyToken,
} from '../../../lib/whatsapp';

/**
 * Webhook de WhatsApp (Meta): guarda lo que escribe la clienta, el estado de cada mensaje
 * (✓ enviado, ✓✓ entregado, leído) con su cobro, y la respuesta a los botones
 * "Confirmo" / "Cambiar hora" del recordatorio. Meta firma cada envío con el App Secret.
 */
export const prerender = false;

type Msg = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  button?: { text?: string; payload?: string };
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { filename?: string; caption?: string };
  location?: { name?: string; address?: string; latitude: number; longitude: number };
  reaction?: { emoji?: string };
  /** Mensaje nuestro al que responde (p. ej. el recordatorio con botones). */
  context?: { id?: string };
};

const KIND: Record<string, string> = {
  text: 'texto',
  image: 'imagen',
  audio: 'audio',
  voice: 'audio',
  video: 'video',
  document: 'documento',
  sticker: 'sticker',
  location: 'ubicación',
  contacts: 'contacto',
  button: 'botón',
  interactive: 'botón',
  reaction: 'reacción',
};

function bodyOf(m: Msg): string {
  switch (m.type) {
    case 'text':
      return m.text?.body ?? '';
    case 'button':
      return m.button?.text ?? m.button?.payload ?? '';
    case 'interactive':
      return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? '';
    case 'image':
      return m.image?.caption ? `📷 ${m.image.caption}` : '📷 Foto';
    case 'video':
      return m.video?.caption ? `🎥 ${m.video.caption}` : '🎥 Video';
    case 'audio':
    case 'voice':
      return '🎤 Nota de voz';
    case 'document':
      return `📄 ${m.document?.filename ?? 'Documento'}`;
    case 'sticker':
      return 'Sticker';
    case 'location':
      return `📍 ${[m.location?.name, m.location?.address].filter(Boolean).join(', ') || `${m.location?.latitude}, ${m.location?.longitude}`}`;
    case 'reaction':
      return m.reaction?.emoji ? `Reaccionó ${m.reaction.emoji}` : 'Quitó una reacción';
    default:
      return `[${m.type}]`;
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

export const GET: APIRoute = ({ url }) => {
  // Meta comprueba la URL una vez al configurarla.
  const token = verifyToken();
  const ok = url.searchParams.get('hub.mode') === 'subscribe' && token && safeEqual(url.searchParams.get('hub.verify_token') ?? '', token);
  return ok ? new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('Forbidden', { status: 403 });
};

export const POST: APIRoute = async ({ request }) => {
  const raw = await request.text();
  if (raw.length > 500_000) return new Response('Too large', { status: 413 });
  if (!(await validSignature(raw, request.headers.get('X-Hub-Signature-256')))) return new Response('Bad signature', { status: 401 });

  let payload: { entry?: { changes?: { value?: { messages?: Msg[]; statuses?: Parameters<typeof applyStatus>[0][] } }[] }[] };
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  // Cada mensaje y cada estado se procesa por separado: si uno falla, los demás del lote siguen.
  // Se responde 200 igual para que Meta no reenvíe en bucle; los errores quedan en los logs de Vercel.
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const v = change.value ?? {};

      for (const m of v.messages ?? []) {
        try {
          const phone = String(m.from ?? '').replace(/\D/g, '');
          if (!/^[0-9]{7,15}$/.test(phone)) continue;
          // Si responde a un mensaje nuestro (botones), es la cita de ese mensaje; si no, la próxima activa.
          const appt = (m.context?.id ? await appointmentForReply(m.context.id) : null) ?? (await appointmentForPhone(phone));
          const body = bodyOf(m);
          const fresh = await saveInbound({
            appointment_id: appt?.id ?? null,
            phone,
            body,
            kind: KIND[m.type] ?? m.type.slice(0, 20),
            wa_message_id: m.id,
            created_at: new Date(Number(m.timestamp) * 1000 || Date.now()).toISOString(),
          });

          // Botones del recordatorio (solo una vez por mensaje, y solo para citas activas que no han pasado).
          const isButton = m.type === 'button' || m.type === 'interactive';
          const active = appt && (appt.status === 'confirmada' || appt.status === 'pendiente') && new Date(appt.starts_at).getTime() > Date.now();
          if (!fresh || !isButton || !active) continue;
          const answer = norm(body);
          const name = appt.customer_name.split(' ')[0];
          const when = `${prettyDate(appt.starts_at).toLowerCase()} a las ${prettyTime(appt.starts_at)}`;
          if (answer === norm(BUTTON_CONFIRM)) {
            await updateAppointment(appt.id, { client_confirmed_at: new Date().toISOString(), change_requested_at: null });
            await autoReply(appt, phone, `¡Gracias, ${name}! 💖 Tu cita quedó confirmada para el ${when}. Te espero ✨`);
          } else if (answer === norm(BUTTON_CHANGE)) {
            await updateAppointment(appt.id, { change_requested_at: new Date().toISOString(), client_confirmed_at: null });
            await autoReply(appt, phone, `Listo, ${name} 👌 Cuéntame qué día y hora te quedan mejor y te ayudo a cambiarla.`);
          }
        } catch (e) {
          console.error('whatsapp webhook: mensaje', m.id, e);
        }
      }

      for (const s of v.statuses ?? []) {
        try {
          await applyStatus(s);
        } catch (e) {
          console.error('whatsapp webhook: estado', s.id, e);
        }
      }
    }
  }
  return new Response('ok', { status: 200 });
};
