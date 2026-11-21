import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { createCitas } from '../../../lib/cita';
import { deleteReceipt, expireIfUnpaid, getAppointment, listPendingWithoutReceipt, updateAppointment, updateAppointmentIfReceipt } from '../../../lib/db';
import { cancelCalendarEvent, googleConfigured } from '../../../lib/google';
import { sha256 } from '../../../lib/crypto';
import { json } from '../../../lib/http';

/** Tarea programada (Supabase pg_cron cada 15 min): libera cupos sin abono. Protegida con CRON_SECRET. */
export const POST: APIRoute = async ({ request }) => {
  const secret = getSecret('CRON_SECRET');
  if (!secret) return json({ error: 'CRON_SECRET no configurado' }, 503);
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  // Compara hashes para no filtrar el secreto por tiempo de respuesta.
  if ((await sha256(given)) !== (await sha256(secret))) return json({ error: 'No autorizado' }, 401);

  const citas = createCitas(
    { getAppointment, updateAppointment, updateAppointmentIfReceipt, deleteReceipt, listPendingWithoutReceipt, expireIfUnpaid },
    { calendario: googleConfigured() ? { cancelar: (id) => cancelCalendarEvent(id, false) } : null },
  );
  return json(await citas.tick());
};
