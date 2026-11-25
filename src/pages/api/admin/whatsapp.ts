import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { getAppointment } from '../../../lib/db';
import { isUuid } from '../../../lib/admin';
import { sendFree, waErrorText, waMessagesFor, type SendResult } from '../../../lib/whatsapp';
import type { WaMessage } from '../../../lib/types';

const pick = (messages: WaMessage[]) =>
  messages.map(({ id, direction, status, body, kind, error, created_at }) => ({ id, direction, status, body, kind, error, created_at }));

/** Conversación de WhatsApp de una clienta (ruta protegida del panel; la consulta cada 10 s mientras la cita está abierta). */
export const GET: APIRoute = async ({ url }) => {
  const phone = (url.searchParams.get('phone') ?? '').replace(/\D/g, '');
  if (!/^[0-9]{7,15}$/.test(phone)) return json({ error: 'Número no válido' }, 400);
  return json({ messages: pick(await waMessagesFor(phone, 60)) });
};

/** Respuesta libre a la clienta desde la conversación, sin recargar el panel. */
export const POST: APIRoute = async ({ request }) => {
  const fd = await request.formData().catch(() => null);
  const id = String(fd?.get('id') ?? '');
  const text = String(fd?.get('text') ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 2000);
  if (!isUuid(id)) return json({ ok: false, error: 'Algo salió mal. Recarga la página e intenta de nuevo.' }, 400);
  if (!text) return json({ ok: false, error: 'Escribe el mensaje.' }, 400);
  const appt = await getAppointment(id);
  if (!appt) return json({ ok: false, error: 'No encontramos esa cita. Recarga la página.' }, 404);
  const r = await sendFree(appt, text).catch((e) => ({ ok: false, reason: 'error', error: String(e?.message ?? e) }) as SendResult);
  const messages = pick(await waMessagesFor(appt.customer_phone, 60).catch(() => []));
  if (!r.ok && r.reason === 'window_closed') {
    const who = appt.customer_name.split(' ')[0];
    return json({ ok: false, closed: true, messages, error: `${who} no te ha escrito en las últimas 24 horas: WhatsApp solo deja mandar plantillas. Usa «Pedir confirmación» o «Abrir en mi WhatsApp».` }, 409);
  }
  if (!r.ok) return json({ ok: false, messages, error: `No se pudo enviar: ${waErrorText(r)}.` }, 502);
  return json({ ok: true, messages });
};
