/**
 * Dominio de la cita: valor, abono y (en próximos tickets) ciclo del abono y avisos.
 * No importa Supabase ni hace HTTP; lo que necesite de fuera se le inyecta.
 */
import { depositOf, priceFor } from './defaults';
import type { Service } from './types';

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
