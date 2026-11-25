import type { APIRoute } from 'astro';
import { getAppointment, receiptFile } from '../../lib/db';
import { isUuid } from '../../lib/admin';

const TYPES: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

/**
 * Comprobante del abono servido desde el mismo panel (solo para Betsy: ruta protegida).
 * Antes se usaba un enlace firmado de 10 minutos que caducaba si el panel llevaba rato abierto.
 */
export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id');
  const a = isUuid(id) ? await getAppointment(id) : null;
  const file = a?.receipt_path ? await receiptFile(a.receipt_path).catch(() => null) : null;
  if (!a?.receipt_path || !file) return new Response('No encontramos el comprobante.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const ext = (a.receipt_path.split('.').pop() ?? '').toLowerCase();
  const type = TYPES[ext] ?? (file.type || 'application/octet-stream');
  return new Response(file.stream(), {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename="comprobante.${ext || 'bin'}"`,
      'Cache-Control': 'private, no-store',
    },
  });
};
