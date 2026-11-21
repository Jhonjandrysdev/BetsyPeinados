import type { APIRoute } from 'astro';
import { getAppointment, getService } from '../../lib/db';
import { isUuid } from '../../lib/admin';
import { json, limited } from '../../lib/http';
import { saldoDe, valorDeCita } from '../../lib/cita';

/** Estado de una cita para la página de la clienta (se consulta cada 15 s mientras la página está abierta). */
export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  const id = url.searchParams.get('id');
  if (!isUuid(id)) return json({ error: 'Solicitud inválida' }, 400);
  if (await limited(request, clientAddress, 'estado', 400, 3600)) return json({ error: 'Demasiadas consultas' }, 429);
  const a = await getAppointment(id);
  if (!a) return json({ error: 'No encontrada' }, 404);
  // Antes de la migración el valor se calcula con el servicio, igual que en la página.
  const v = valorDeCita(a, a.price === undefined && a.service_id ? await getService(a.service_id) : null);
  return json(
    { status: a.status, receipt: Boolean(a.receipt_path), price: v.price, deposit: v.deposit, saldo: saldoDe(v), travel_fee: a.travel_fee ?? null },
    200,
    { 'Cache-Control': 'no-store' },
  );
};
