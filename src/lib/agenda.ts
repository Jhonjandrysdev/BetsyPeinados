/**
 * Reglas de la agenda que Betsy usa en el panel: si una hora cae en su horario de atención
 * y qué hacer en Google Calendar cuando cambia el estado de una cita. Puro.
 */
import { minutesOf, timeOf, weekdayOf } from './time';
import type { AppointmentStatus, BlockedDate, BusinessHour } from './types';

/** "09:00:00" → "9:00 a. m." */
const horaBonita = (hhmm: string) => {
  const m = minutesOf(hhmm);
  const h = Math.floor(m / 60);
  const [, mm] = timeOf(m).split(':');
  return `${h % 12 || 12}:${mm} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};

/**
 * Por qué una cita de `duracionMin` minutos el `fecha` a las `hora` no cabe en el horario de atención,
 * o null si cabe. Betsy puede moverla igual a sabiendas.
 */
export function fueraDeHorario({ fecha, hora, duracionMin, horarios, bloqueos }: { fecha: string; hora: string; duracionMin: number; horarios: BusinessHour[]; bloqueos: BlockedDate[] }): string | null {
  const bloqueo = bloqueos.find((b) => b.day === fecha);
  if (bloqueo) return `Ese día está bloqueado${bloqueo.reason ? ` (${bloqueo.reason})` : ''}`;
  const h = horarios.find((x) => x.weekday === weekdayOf(fecha));
  if (!h?.enabled) return 'Ese día no atiendes según tu horario';
  const inicio = minutesOf(hora);
  if (inicio < minutesOf(h.open_time) || inicio + duracionMin > minutesOf(h.close_time)) {
    return `Esa hora queda fuera de tu horario de ese día (${horaBonita(h.open_time)} a ${horaBonita(h.close_time)})`;
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
