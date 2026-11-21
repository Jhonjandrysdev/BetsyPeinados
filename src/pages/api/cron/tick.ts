import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { createCitas } from '../../../lib/cita';
import { citaStore, getAppointment } from '../../../lib/db';
import { sendNotice, waConfigured } from '../../../lib/whatsapp';
import { cancelCalendarEvent, googleConfigured } from '../../../lib/google';
import { sha256 } from '../../../lib/crypto';
import { json } from '../../../lib/http';

/** Tarea programada (Supabase pg_cron cada 15 min): libera cupos sin abono. Protegida con CRON_SECRET. */
export const POST: APIRoute = async ({ request }) => {
  const secret = getSecret('CRON_SECRET');
  if (!secret) return json({ error: 'CRON_SECRET no configurado' }, 503);
  const given = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1] ?? '';
  // Compara hashes para no filtrar el secreto por tiempo de respuesta.
  if ((await sha256(given)) !== (await sha256(secret))) return json({ error: 'No autorizado' }, 401);

  const citas = createCitas(citaStore, { calendario: googleConfigured() ? { cancelar: (id) => cancelCalendarEvent(id, false) } : null });
  const r = await citas.vencerCuposSinAbono();
  // Con el WhatsApp automático conectado, a cada clienta le llega el aviso de cupo liberado.
  let avisadas = 0;
  if (waConfigured()) {
    for (const id of r.vencidas) {
      const a = await getAppointment(id);
      const sent = a ? await sendNotice(a, 'cupo_liberado').catch((e) => (console.error('Aviso de cupo liberado', e), null)) : null;
      if (sent?.ok) avisadas++;
    }
  }
  return json({ ...r, avisadas });
};
