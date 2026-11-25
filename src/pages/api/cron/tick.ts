import type { APIRoute } from 'astro';
import { getSecret } from 'astro:env/server';
import { createCitas } from '../../../lib/cita';
import { citaStore } from '../../../lib/db';
import { sendNotice, waConfigured } from '../../../lib/whatsapp';
import { cancelCalendarEvent, googleConfigured } from '../../../lib/google';
import { safeEqual } from '../../../lib/crypto';
import { json } from '../../../lib/http';

const LIBERAR_CUPOS = false;

/** Tarea programada (Supabase pg_cron cada 15 min): libera cupos sin abono. Protegida con CRON_SECRET. */
export const POST: APIRoute = async ({ request }) => {
  const secret = getSecret('CRON_SECRET');
  if (!secret) return json({ error: 'CRON_SECRET no configurado' }, 503);
  // Misma comprobación que /api/cron/recordatorios (mismo secreto), en tiempo constante.
  if (!safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) return json({ error: 'No autorizado' }, 401);

  const citas = createCitas(citaStore, {
    calendario: googleConfigured() ? { cancelar: (id) => cancelCalendarEvent(id, false) } : null,
    // Con el WhatsApp automático conectado, a la clienta le llega el aviso de cupo liberado.
    avisar: waConfigured() ? async (a, aviso) => (await sendNotice(a, aviso)).ok : null,
  });
  // Desde el 2026-11-25 Betsy confirma cada reserva y el abono por WhatsApp: el sistema ya no libera
  // cupos solo. Para volver a liberarlos al vencer el plazo, cambia LIBERAR_CUPOS a true.
  if (!LIBERAR_CUPOS) return json({ vencidas: [], avisadas: 0, pausado: true });
  return json(await citas.vencerCuposSinAbono());
};
