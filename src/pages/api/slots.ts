import type { APIRoute } from 'astro';
import { getService } from '../../lib/db';
import { json, limited } from '../../lib/http';
import { availableSlots } from '../../lib/slots';
import { isDate } from '../../lib/time';

export const GET: APIRoute = async ({ url, request, clientAddress }) => {
  if (await limited(request, clientAddress, 'slots', 90, 60)) return json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, 429);
  const date = url.searchParams.get('date');
  const serviceId = url.searchParams.get('service') ?? '';
  if (!isDate(date) || !/^[0-9a-f-]{36}$/i.test(serviceId)) return json({ error: 'Parámetros inválidos' }, 400);
  const service = await getService(serviceId);
  if (!service?.active) return json({ error: 'Servicio no disponible' }, 404);
  return json({ date, slots: await availableSlots(date, service.duration_min) });
};
