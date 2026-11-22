/**
 * Reglas de la agenda que Betsy usa en el panel: si una hora cae en su horario de atención
 * y qué hacer en Google Calendar cuando cambia el estado de una cita. Puro.
 */
import { minutesOf, prettyClock, weekdayOf } from './time';
import type { AppointmentStatus, BlockedDate, BusinessHour } from './types';

/** Minutos (desde la medianoche) en que Betsy abre y cierra un día; null si no atiende o está bloqueado. */
export function ventanaDelDia(fecha: string, horarios: BusinessHour[], bloqueos: BlockedDate[]): { abre: number; cierra: number } | null {
  if (bloqueos.some((b) => b.day === fecha)) return null;
  const h = horarios.find((x) => x.weekday === weekdayOf(fecha));
  return h?.enabled ? { abre: minutesOf(h.open_time), cierra: minutesOf(h.close_time) } : null;
}

/**
 * Por qué una cita de `duracionMin` minutos el `fecha` a las `hora` no cabe en el horario de atención,
 * o null si cabe. Betsy puede moverla igual a sabiendas.
 */
export function fueraDeHorario({ fecha, hora, duracionMin, horarios, bloqueos }: { fecha: string; hora: string; duracionMin: number; horarios: BusinessHour[]; bloqueos: BlockedDate[] }): string | null {
  const bloqueo = bloqueos.find((b) => b.day === fecha);
  if (bloqueo) return `Ese día está bloqueado${bloqueo.reason ? ` (${bloqueo.reason})` : ''}`;
  const ventana = ventanaDelDia(fecha, horarios, bloqueos);
  if (!ventana) return 'Ese día no atiendes según tu horario';
  const inicio = minutesOf(hora);
  if (inicio < ventana.abre || inicio + duracionMin > ventana.cierra) {
    const h = horarios.find((x) => x.weekday === weekdayOf(fecha))!;
    return `Esa hora queda fuera de tu horario de ese día (${prettyClock(h.open_time)} a ${prettyClock(h.close_time)})`;
  }
  return null;
}

export type AccionCalendario = 'crear' | 'confirmar' | 'cancelar' | null;

/** Qué hacer con el evento de Google Calendar cuando una cita pasa de `antes` a `despues`. */
export function accionCalendario({ antes, despues, tieneEvento }: { antes: AppointmentStatus; despues: AppointmentStatus; tieneEvento: boolean }): AccionCalendario {
  if (antes === despues) return null;
  // Queda en firme (abono confirmado o cita cancelada que se reactiva): el evento debe existir.
  if (despues === 'confirmada' && (antes === 'pendiente' || antes === 'cancelada')) return tieneEvento ? 'confirmar' : 'crear';
  if (despues === 'cancelada') return tieneEvento ? 'cancelar' : null;
  return null;
}
