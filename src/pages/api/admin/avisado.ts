import type { APIRoute } from 'astro';
import { getAppointment, markNotified } from '../../../lib/db';
import { isUuid } from '../../../lib/admin';
import { NOTICE_EVENTS } from '../../../lib/messages';

/** Anota que Betsy abrió el aviso de WhatsApp de una cita (ruta protegida del panel). */
export const POST: APIRoute = async ({ request }) => {
  const fd = new URLSearchParams(await request.text());
  const id = fd.get('id');
  const ev = fd.get('ev') ?? '';
  if (!isUuid(id) || !NOTICE_EVENTS.some((e) => e.id === ev)) return new Response(null, { status: 400 });
  const a = await getAppointment(id);
  if (!a) return new Response(null, { status: 404 });
  try {
    await markNotified(a, ev);
  } catch (e) {
    console.error(e);
  }
  return new Response(null, { status: 204 });
};
