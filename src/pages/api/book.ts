import type { APIRoute } from 'astro';
import { book, BookingError, bookingSchema } from '../../lib/booking';
import { checkFormToken, json, limited, readJson } from '../../lib/http';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Máx. 5 reservas por hora y 12 por día desde la misma conexión.
  if ((await limited(request, clientAddress, 'book-h', 5, 3600)) || (await limited(request, clientAddress, 'book-d', 12, 86400))) {
    return json({ error: 'Has hecho varias reservas seguidas. Escríbenos por WhatsApp para ayudarte.' }, 429);
  }
  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body) return json({ error: 'Solicitud inválida' }, 400);

  // Honeypot: los bots suelen rellenar este campo oculto.
  if (typeof body.website === 'string' && body.website.length > 0) return json({ ok: true, id: crypto.randomUUID() });

  // Token firmado: bloquea envíos automáticos o demasiado rápidos para ser humanos.
  if (!(await checkFormToken(body.ft, 'book', 3000))) {
    return json({ error: 'No pudimos validar el formulario. Recarga la página e intenta de nuevo.' }, 400);
  }
  if (body.consent !== true) return json({ error: 'Debes aceptar la política de privacidad.' }, 400);

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Revisa los datos' }, 400);

  try {
    const appt = await book(parsed.data, 'web');
    return json({ ok: true, id: appt.id });
  } catch (e) {
    if (e instanceof BookingError) return json({ error: e.message }, e.status);
    console.error('Error al reservar', e);
    return json({ error: 'No pudimos guardar tu cita. Intenta de nuevo o escríbenos por WhatsApp.' }, 500);
  }
};
