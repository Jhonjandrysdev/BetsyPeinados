import type { APIRoute } from 'astro';
import { getAppointment, receiptUrl } from '../../lib/db';
import { isUuid } from '../../lib/admin';

/** Abre el comprobante del abono con un enlace temporal (solo para Betsy: ruta protegida del panel). */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  const a = isUuid(id) ? await getAppointment(id) : null;
  const link = a?.receipt_path ? await receiptUrl(a.receipt_path) : null;
  if (!link) return new Response('No encontramos el comprobante.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(null, { status: 302, headers: { Location: link, 'Cache-Control': 'no-store' } });
};
