import type { APIRoute } from 'astro';
import { json } from '../../../lib/http';
import { waMessagesFor } from '../../../lib/whatsapp';

/** Conversación de WhatsApp de una clienta (ruta protegida del panel; la consulta cada 10 s mientras la cita está abierta). */
export const GET: APIRoute = async ({ url }) => {
  const phone = (url.searchParams.get('phone') ?? '').replace(/\D/g, '');
  if (!/^[0-9]{7,15}$/.test(phone)) return json({ error: 'Número no válido' }, 400);
  const messages = await waMessagesFor(phone, 60);
  return json({
    messages: messages.map(({ id, direction, status, body, kind, error, created_at }) => ({ id, direction, status, body, kind, error, created_at })),
  });
};
