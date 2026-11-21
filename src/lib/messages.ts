// Mensajes de WhatsApp para la clienta, según el momento de la cita.
// Betsy los edita en el panel (Mensajes); si no ha cambiado uno, se usa el de aquí.
import type { Appointment, SiteSettings } from './types';
import { DEPOSIT_PCT } from './defaults';
import { formatCOP, prettyDate, prettyTime } from './time';

export type NoticeEvent = 'apartada' | 'comprobante_rechazado' | 'cupo_liberado' | 'abono' | 'recordatorio' | 'gracias' | 'cancelada';

export const NOTICE_EVENTS: { id: NoticeEvent; label: string; when: string }[] = [
  { id: 'apartada', label: 'Cupo apartado', when: 'La clienta reservó y falta el comprobante del abono.' },
  { id: 'comprobante_rechazado', label: 'Comprobante rechazado', when: 'Rechazaste el comprobante: la clienta debe enviar uno nuevo.' },
  { id: 'cupo_liberado', label: 'Cupo liberado', when: 'Pasó el plazo sin comprobante y el sistema liberó el horario.' },
  { id: 'abono', label: 'Abono recibido', when: 'Confirmaste el abono: la cita queda en firme.' },
  { id: 'recordatorio', label: 'Recordatorio', when: 'Unos días u horas antes de la cita.' },
  { id: 'gracias', label: 'Gracias', when: 'Después de marcar la cita como realizada.' },
  { id: 'cancelada', label: 'Cita cancelada', when: 'Cuando cancelas una cita.' },
];

export const DEFAULT_TEMPLATES: Record<NoticeEvent, string> = {
  apartada:
    'Hola {nombre} 👋 Te escribe Betsy Peinados. Tu cupo de {servicio} para el {fecha} a las {hora} está apartado ✨\n\nPara confirmarlo transfiere el abono del {porcentaje} ({abono}) a la llave {llave} y envíame el comprobante por aquí. Sin abono no se garantiza la reserva.',
  comprobante_rechazado:
    'Hola {nombre} 👋 Revisé el comprobante de tu cita de {servicio} del {fecha} a las {hora} y no lo pude validar: {motivo}.\n\nPor favor súbelo de nuevo en la página de tu reserva o envíamelo por aquí para confirmar tu cupo 💖',
  cupo_liberado:
    'Hola {nombre} 👋 Como no recibí el comprobante del abono a tiempo, liberé el cupo de {servicio} del {fecha} a las {hora}.\n\nSi aún quieres tu cita, escríbeme por aquí o reserva de nuevo en la web y lo miramos 💖',
  abono:
    '¡Hola {nombre}! ✅ Recibí tu abono. Tu cita de {servicio} quedó CONFIRMADA para el {fecha} a las {hora} 🎀\n\nRecuerda venir con el cabello limpio y seco (no realizamos blower). ¡Te espero! 💖',
  recordatorio: 'Hola {nombre} 👋 Te recuerdo tu cita de {servicio} el {fecha} a las {hora} ✨ Recuerda: cabello limpio y seco. ¡Te espero!',
  gracias: '¡Gracias por venir, {nombre}! 💖 Si te tomas una foto con tu peinado, etiquétame en Instagram @{instagram}.',
  cancelada: 'Hola {nombre}, tu cita de {servicio} del {fecha} a las {hora} quedó cancelada. Si quieres reprogramar, escríbeme por aquí 💖',
};

export const PLACEHOLDERS = ['nombre', 'servicio', 'fecha', 'hora', 'valor', 'abono', 'porcentaje', 'llave', 'codigo', 'direccion', 'instagram', 'motivo'];

export interface FillData {
  a: Appointment;
  s: SiteSettings;
  price?: number | null;
  deposit?: number | null;
}

export function fillTemplate(body: string, { a, s, price, deposit }: FillData): string {
  const v: Record<string, string> = {
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
    motivo: a.receipt_rejected_reason || 'no se ve completo',
  };
  return body.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);
}
