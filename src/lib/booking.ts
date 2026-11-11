import { z } from 'zod';
import { createAppointment, getService, getSettings, updateAppointment, SlotTakenError } from './db';
import { createCalendarEvent } from './google';
import { availableSlots } from './slots';
import { fromLocal, isDate, isTime } from './time';
import type { Appointment } from './types';

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim();

export const bookingSchema = z.object({
  service_id: z.string().uuid(),
  date: z.string().refine(isDate, 'Fecha inválida'),
  time: z.string().refine(isTime, 'Hora inválida'),
  name: z.string().transform(clean).pipe(z.string().min(2, 'Escribe tu nombre').max(80)),
  phone: z
    .string()
    .transform((s) => s.replace(/[^\d+]/g, ''))
    .transform((s) => (s.startsWith('+') ? s.slice(1) : s.length === 10 && s.startsWith('3') ? `57${s}` : s))
    .pipe(z.string().regex(/^[0-9]{7,15}$/, 'Número de WhatsApp inválido')),
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.union([z.literal(''), z.string().email('Correo inválido').max(120)]))
    .optional()
    .default(''),
  notes: z.string().transform((s) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').trim()).pipe(z.string().max(500)).optional().default(''),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export class BookingError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function book(input: BookingInput, source: 'web' | 'admin'): Promise<Appointment> {
  const service = await getService(input.service_id);
  if (!service || (!service.active && source === 'web')) throw new BookingError('El servicio no está disponible.');

  if (source === 'web') {
    const slots = await availableSlots(input.date, service.duration_min);
    if (!slots.includes(input.time)) throw new BookingError('Ese horario ya no está disponible. Elige otro, por favor.', 409);
  }

  const start = fromLocal(input.date, input.time);
  const end = new Date(start.getTime() + service.duration_min * 60_000);

  let appt: Appointment;
  try {
    appt = await createAppointment({
      service_id: service.id,
      service_name: service.name,
      customer_name: input.name,
      customer_phone: input.phone,
      customer_email: input.email || null,
      notes: input.notes,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      status: 'confirmada',
      source,
    });
  } catch (e) {
    if (e instanceof SlotTakenError) throw new BookingError('Ese horario se acaba de ocupar. Elige otro, por favor.', 409);
    throw e;
  }

  // Sincroniza con Google Calendar sin bloquear la reserva si Google falla.
  try {
    const eventId = await createCalendarEvent(appt, await getSettings());
    if (eventId) {
      await updateAppointment(appt.id, { google_event_id: eventId });
      appt.google_event_id = eventId;
    }
  } catch (e) {
    console.error('No se pudo crear el evento en Google Calendar', e);
  }
  return appt;
}
