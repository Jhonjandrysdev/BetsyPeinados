import { getAppointments, getBlockedDates, getHours, getSettings } from './db';
import { googleBusy } from './google';
import { addDays, fromLocal, localDate, minutesOf, timeOf, weekdayOf } from './time';

export interface DayAvailability {
  date: string;
  slots: string[]; // HH:MM locales
}

interface Range {
  start: number;
  end: number;
}

/** Horarios libres para un servicio de `durationMin` minutos en una fecha local. */
export async function availableSlots(date: string, durationMin: number): Promise<string[]> {
  const [settings, hours, blocked] = await Promise.all([getSettings(), getHours(), getBlockedDates(date)]);

  const today = localDate();
  const lastDay = addDays(today, settings.max_days_ahead);
  if (date < today || date > lastDay) return [];
  if (blocked.some((b) => b.day === date)) return [];

  const h = hours.find((x) => x.weekday === weekdayOf(date));
  if (!h || !h.enabled) return [];

  const dayStart = fromLocal(date, '00:00');
  const dayEnd = fromLocal(addDays(date, 1), '00:00');

  const [appointments, busy] = await Promise.all([
    getAppointments({ from: dayStart, to: dayEnd, activeOnly: true }),
    googleBusy(dayStart, dayEnd).catch((e) => {
      console.error('Google freebusy falló', e);
      return [] as Range[];
    }),
  ]);

  const taken: Range[] = [
    ...appointments.map((a) => ({ start: new Date(a.starts_at).getTime(), end: new Date(a.ends_at).getTime() })),
    ...busy,
  ];

  const earliest = Date.now() + settings.min_notice_hours * 3600_000;
  const open = minutesOf(h.open_time);
  const close = minutesOf(h.close_time);
  const step = settings.slot_step_min;
  const out: string[] = [];

  for (let m = open; m + durationMin <= close; m += step) {
    const t = timeOf(m);
    const s = fromLocal(date, t).getTime();
    const e = s + durationMin * 60_000;
    if (s < earliest) continue;
    if (taken.some((r) => r.start < e && r.end > s)) continue;
    out.push(t);
  }
  return out;
}

/** Días (en una ventana) que tienen horario de atención y no están bloqueados. */
export async function openDays(from: string, days: number): Promise<string[]> {
  const [settings, hours, blocked] = await Promise.all([getSettings(), getHours(), getBlockedDates(from)]);
  const last = addDays(localDate(), settings.max_days_ahead);
  const blockedSet = new Set(blocked.map((b) => b.day));
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i);
    if (d > last) break;
    const h = hours.find((x) => x.weekday === weekdayOf(d));
    if (h?.enabled && !blockedSet.has(d)) out.push(d);
  }
  return out;
}
