import type { APIRoute } from 'astro';
import { getAppointment } from '../../lib/db';
import { isUuid } from '../../lib/admin';
import { json, limited } from '../../lib/http';

/** Estado de una cita para la página de la clienta (se consulta cada 15 s mientras espera el abono). */
export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  const id = url.searchParams.get('id');
  if (!isUuid(id)) return json({ error: 'Solicitud inválida' }, 400);
  if (await limited(request, clientAddress, 'estado', 400, 3600)) return json({ error: 'Demasiadas consultas' }, 429);
  const a = await getAppointment(id);
  if (!a) return json({ error: 'No encontrada' }, 404);
  return json({ status: a.status, receipt: Boolean(a.receipt_path) }, 200, { 'Cache-Control': 'no-store' });
};
