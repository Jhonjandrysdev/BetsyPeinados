/**
 * Catálogo del home: deriva, a partir de servicios, paquetes, horario y FAQ, lo que muestra la página
 * de inicio. Puro (sin E/S) para poder probarlo sin servidor.
 */
import { depositOf, type EventPackage } from './defaults';
import { localDate, weekdayOf } from './time';
import type { BusinessHour, Service } from './types';

export const enlaceReserva = (slug: string) => `/reservar?servicio=${slug}`;

export interface ServicioDelHome {
  service: Service;
  /** Nombres de los paquetes que usan este servicio (Grado, Quinceañera…). */
  etiquetas: string[];
  href: string;
}

export function serviciosDelHome(services: Service[], packages: EventPackage[]): ServicioDelHome[] {
  return services.map((service) => ({
    service,
    etiquetas: packages.filter((p) => p.serviceSlug === service.slug).map((p) => p.name),
    href: enlaceReserva(service.slug),
  }));
}

export interface OpcionDeOcasion {
  key: string;
  label: string;
  /** null = se cotiza. */
  price: number | null;
  /** Mostrar "desde" (el valor varía por largo). */
  from: boolean;
  unit?: string;
  deposit: number | null;
  includes: string[];
  durationMin?: number;
  /** Reservar online si hay servicio activo y precio; si no, cotizar por WhatsApp. */
  accion: { tipo: 'reservar'; href: string } | { tipo: 'cotizar' };
}

/** Opciones del panel de ocasión: primero los paquetes y luego los servicios que ningún paquete usa. */
export function opcionesDeOcasion(services: Service[], packages: EventPackage[]): OpcionDeOcasion[] {
  const bySlug = new Map(services.map((s) => [s.slug, s]));
  const usados = new Set(packages.map((p) => p.serviceSlug).filter(Boolean));
  const accion = (sv: Service | undefined, price: number | null): OpcionDeOcasion['accion'] =>
    sv && price ? { tipo: 'reservar', href: enlaceReserva(sv.slug) } : { tipo: 'cotizar' };

  const dePaquetes = packages.map((p): OpcionDeOcasion => {
    const sv = p.serviceSlug ? bySlug.get(p.serviceSlug) : undefined;
    return {
      key: p.slug,
      label: p.name,
      price: p.price,
      from: Boolean(p.from),
      unit: p.unit,
      deposit: depositOf(p.price),
      includes: p.includes,
      durationMin: sv?.duration_min,
      accion: accion(sv, p.price),
    };
  });
  const sueltos = services
    .filter((s) => !usados.has(s.slug))
    .map(
      (s): OpcionDeOcasion => ({
        key: s.slug,
        label: s.name,
        price: s.price_from,
        from: true,
        deposit: depositOf(s.price_from),
        includes: s.description ? [s.description] : [],
        durationMin: s.duration_min,
        accion: accion(s, s.price_from),
      }),
    );
  return [...dePaquetes, ...sueltos];
}

/** "Hoy atiendo de 08:00 a 18:00" u "Hoy no atiendo", según el día en Bogotá. */
export function horarioDeHoy(hours: BusinessHour[], now: Date): string {
  const wd = weekdayOf(localDate(now));
  const h = hours.find((x) => x.weekday === wd);
  return h?.enabled ? `Hoy atiendo de ${h.open_time.slice(0, 5)} a ${h.close_time.slice(0, 5)}` : 'Hoy no atiendo';
}

/** Preguntas del home: sin la de precios (ya están en "Servicios y precios"), máximo cuatro. */
export function faqDelHome<T extends { q: string }>(faq: T[]): T[] {
  return faq.filter((f) => !/cu[aá]nto cuesta/i.test(f.q)).slice(0, 4);
}
