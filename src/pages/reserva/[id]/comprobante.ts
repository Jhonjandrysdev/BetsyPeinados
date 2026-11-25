import type { APIRoute } from 'astro';
import { getAppointment, receiptFile } from '../../../lib/db';
import { limited } from '../../../lib/http';

const TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const notFound = () => new Response('No encontramos el comprobante.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

/**
 * Comprobante del abono para el enlace que la clienta le manda a Betsy por WhatsApp.
 * Lo protege lo mismo que /reserva/[id]: el identificador aleatorio de la cita (UUID v4).
 */
export const GET: APIRoute = async ({ params, request, clientAddress }) => {
  const id = params.id ?? '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return notFound();
  if (await limited(request, clientAddress, 'receipt-view', 60, 3600)) return new Response('Demasiadas consultas. Intenta más tarde.', { status: 429 });
  const a = await getAppointment(id);
  const file = a?.receipt_path ? await receiptFile(a.receipt_path).catch(() => null) : null;
  if (!a?.receipt_path || !file) return notFound();
  const ext = (a.receipt_path.split('.').pop() ?? '').toLowerCase();
  return new Response(file.stream(), {
    headers: {
      'Content-Type': TYPES[ext] ?? (file.type || 'application/octet-stream'),
      'Content-Disposition': `inline; filename="comprobante-${id.slice(0, 8)}.${ext || 'bin'}"`,
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
};
