// Colombia (America/Bogota) usa UTC-05:00 todo el año, sin horario de verano.
export const TZ = 'America/Bogota';
export const TZ_OFFSET = '-05:00';
const OFFSET_MS = -5 * 60 * 60 * 1000;

/** Fecha local (YYYY-MM-DD) en Bogotá para un instante dado. */
export function localDate(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Hora local HH:MM en Bogotá. */
export function localTime(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(11, 16);
}

/** Convierte fecha + hora locales de Bogotá a Date (UTC). */
export function fromLocal(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00${TZ_OFFSET}`);
}

/** Día de la semana (0 = domingo) para una fecha YYYY-MM-DD. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeOf(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const fmtLong = new Intl.DateTimeFormat('es-CO', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });

export function prettyDate(d: Date | string): string {
  const s = fmtLong.format(typeof d === 'string' ? new Date(d) : d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function prettyTime(d: Date | string): string {
  return fmtTime.format(typeof d === 'string' ? new Date(d) : d).replace(/\s/g, ' ');
}

export function formatCOP(n: number | null | undefined): string {
  if (n == null) return 'A convenir';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
