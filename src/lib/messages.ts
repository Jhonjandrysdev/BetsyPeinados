// Mensajes de WhatsApp para la clienta, según el momento de la cita.
// Betsy los edita en el panel (Mensajes); si no ha cambiado uno, se usa el de aquí.
import type { Appointment, SiteSettings } from './types';
import { DEPOSIT_PCT } from './defaults';
import { formatCOP, prettyDate, prettyTime } from './time';

export type NoticeEvent = 'apartada' | 'abono' | 'recordatorio' | 'reagendada' | 'gracias' | 'cancelada';

export const NOTICE_EVENTS: { id: NoticeEvent; label: string; when: string }[] = [
  { id: 'apartada', label: 'Cupo apartado', when: 'La clienta reservó y falta el comprobante del abono.' },
  { id: 'abono', label: 'Abono recibido', when: 'Confirmaste el abono: la cita queda en firme.' },
  { id: 'recordatorio', label: 'Pedir confirmación', when: 'El día antes de la cita (o cuando pulses "Pedir confirmación"). Lleva los botones Confirmo y Cambiar hora.' },
  { id: 'reagendada', label: 'Cita reagendada', when: 'Cuando le cambias la fecha o la hora.' },
  { id: 'gracias', label: 'Gracias', when: 'Después de marcar la cita como realizada.' },
  { id: 'cancelada', label: 'Cita cancelada', when: 'Cuando cancelas una cita.' },
];

export const DEFAULT_TEMPLATES: Record<NoticeEvent, string> = {
  apartada:
    'Hola {nombre} 👋 Te escribe Betsy Peinados. Tu cupo de {servicio} para el {fecha} a las {hora} está apartado ✨\n\nPara confirmarlo transfiere el abono del {porcentaje} ({abono}) a la llave {llave} y envíame el comprobante por aquí. Sin abono no se garantiza la reserva.',
  abono:
    '¡Hola {nombre}! ✅ Recibí tu abono. Tu cita de {servicio} quedó CONFIRMADA para el {fecha} a las {hora} 🎀\n\nRecuerda venir con el cabello limpio y seco (no realizamos blower). ¡Te espero! 💖',
  recordatorio:
    'Hola {nombre} 👋 Te recuerdo tu cita de {servicio} el {fecha} a las {hora} ✨ Recuerda: cabello limpio y seco.\n\n¿Me confirmas que vienes? Si necesitas otra hora, dime y la cambiamos.',
  reagendada: 'Hola {nombre} 👋 Tu cita de {servicio} quedó para el {fecha} a las {hora} ✨ Si no te queda bien, respóndeme por aquí y lo ajustamos 💖',
  gracias: '¡Gracias por venir, {nombre}! 💖 Si te tomas una foto con tu peinado, etiquétame en Instagram @{instagram}.',
  cancelada: 'Hola {nombre}, tu cita de {servicio} del {fecha} a las {hora} quedó cancelada. Si quieres reprogramar, escríbeme por aquí 💖',
};

export const PLACEHOLDERS = ['nombre', 'servicio', 'fecha', 'hora', 'valor', 'abono', 'porcentaje', 'llave', 'codigo', 'direccion', 'instagram'];

export interface FillData {
  a: Appointment;
  s: SiteSettings;
  price?: number | null;
  deposit?: number | null;
}

export function fillTemplate(body: string, data: FillData): string {
  const v = valuesFor(data);
  return body.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
}

/**
 * Plantillas aprobadas en Meta (deben coincidir con docs/whatsapp-automatico.md).
 * Se usan cuando la clienta no ha escrito en las últimas 24 h; cada {{n}} se llena en orden.
 */
export const META_TEMPLATES: Record<NoticeEvent, { text: string; params: (v: Record<string, string>) => string[]; buttons?: string[] }> = {
  apartada: {
    text: 'Hola {{1}}, tu cupo de {{2}} para el {{3}} a las {{4}} está apartado en Betsy Peinados. Para confirmarlo envía el abono de {{5}} a la llave {{6}} y comparte el comprobante por este chat.',
    params: (v) => [v.nombre, v.servicio, v.fecha, v.hora, v.abono, v.llave],
  },
  abono: {
    text: 'Hola {{1}}, recibimos tu abono. Tu cita de {{2}} quedó confirmada para el {{3}} a las {{4}}. Recuerda llegar con el cabello limpio y seco.',
    params: (v) => [v.nombre, v.servicio, v.fecha, v.hora],
  },
  recordatorio: {
    text: 'Hola {{1}}, te recordamos tu cita de {{2}} el {{3}} a las {{4}} en Betsy Peinados. ¿Nos confirmas tu asistencia?',
    params: (v) => [v.nombre, v.servicio, v.fecha, v.hora],
    buttons: ['Confirmo', 'Cambiar hora'],
  },
  reagendada: {
    text: 'Hola {{1}}, tu cita de {{2}} cambió para el {{3}} a las {{4}}. Si no te queda bien, respóndenos por este chat.',
    params: (v) => [v.nombre, v.servicio, v.fecha, v.hora],
  },
  gracias: {
    text: 'Hola {{1}}, gracias por tu cita de {{2}} en Betsy Peinados. Si tienes alguna duda sobre tu peinado, respóndenos por este chat.',
    params: (v) => [v.nombre, v.servicio],
  },
  cancelada: {
    text: 'Hola {{1}}, tu cita de {{2}} del {{3}} a las {{4}} fue cancelada. Si quieres reprogramarla, respóndenos por este chat.',
    params: (v) => [v.nombre, v.servicio, v.fecha, v.hora],
  },
};

/** Valores de las palabras entre llaves para una cita. */
export function valuesFor({ a, s, price, deposit }: FillData): Record<string, string> {
  return {
    nombre: a.customer_name.split(' ')[0],
    servicio: a.service_name,
    fecha: prettyDate(a.starts_at).toLowerCase(),
    hora: prettyTime(a.starts_at),
    valor: price ? formatCOP(price) : 'el valor acordado',
    abono: deposit ? formatCOP(deposit) : `el ${DEPOSIT_PCT}%`,
    porcentaje: `${DEPOSIT_PCT}%`,
    llave: s.pay_key || 'que te comparto',
    codigo: a.id.slice(0, 8).toUpperCase(),
    direccion: a.home_service && a.home_address ? a.home_address : s.address,
    instagram: s.instagram,
  };
}
