import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { getAppointments, getSettings } from '../../../lib/db';
import { addDays, fromLocal, localDate } from '../../../lib/time';
import { sendNotice, waConfigured, waErrorText } from '../../../lib/whatsapp';
import { safeEqual } from '../../../lib/crypto';
import { json } from '../../../lib/http';
import { aceptaAvisos } from '../../../lib/cita';

/**
 * Recordatorio del día anterior con los botones "Confirmo" / "Cambiar hora".
 * Vercel lo llama a diario a las 9:00 a. m. de Colombia (vercel.json) con la cabecera
 * Authorization: Bearer CRON_SECRET. Solo citas confirmadas de mañana que aún no lo recibieron.
 */
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const secret = getSecret('CRON_SECRET');
  if (!secret || !safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return json({ error: 'No autorizado' }, 401);
  if (!waConfigured()) return json({ ok: true, skipped: 'whatsapp_not_configured' });
  const settings = await getSettings();
  if (settings.wa_auto_reminder === false) return json({ ok: true, skipped: 'disabled' });

  const tomorrow = addDays(localDate(), 1);
  const from = fromLocal(tomorrow, '00:00');
  const list = await getAppointments({ from, to: fromLocal(addDays(tomorrow, 1), '00:00'), activeOnly: true });
  const due = list.filter((a) => a.status === 'confirmada' && aceptaAvisos(a) && new Date(a.starts_at) >= from && !a.notified?.recordatorio && !a.client_confirmed_at);

  let sent = 0;
  const failed: string[] = [];
  for (const a of due) {
    const r = await sendNotice(a, 'recordatorio');
    if (r.ok) sent++;
    else failed.push(`${a.id.slice(0, 8)}: ${waErrorText(r)}`);
  }
  if (failed.length) console.error('recordatorios fallidos', failed);
  return json({ ok: true, day: tomorrow, sent, failed: failed.length });
};
