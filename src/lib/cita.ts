/**
 * Dominio de la cita: valor y abono.
 * No importa Supabase ni hace HTTP.
 */
import { depositOf, priceFor } from './defaults';
import type { Appointment, Service } from './types';

export type Tarifa = Pick<Service, 'price_from' | 'price_short' | 'price_medium' | 'price_long'>;

export interface Cotizacion {
  /** Valor de la cita; null si el servicio se cotiza aparte. */
  price: number | null;
  /** Abono; null si el valor no es exacto (solo "desde"). */
  deposit: number | null;
}

/** Valor y abono que quedan fijos en la cita al reservar. */
export function cotizar(sv: Tarifa | null | undefined, hairLength: string | null | undefined): Cotizacion {
  const exact = priceFor(sv, hairLength);
  if (exact != null) return { price: exact, deposit: depositOf(exact) };
  return { price: sv?.price_from ?? null, deposit: null };
}

/** Valor y abono de una cita: los guardados al reservar; si la base aún no tiene esas columnas, se calculan como antes. */
export function valorDeCita(a: Pick<Appointment, 'hair_length' | 'price' | 'deposit'>, sv: Tarifa | null | undefined): Cotizacion {
  return a.price !== undefined ? { price: a.price, deposit: a.deposit ?? null } : cotizar(sv, a.hair_length);
}
