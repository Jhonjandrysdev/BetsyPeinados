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

/** Lo que falta pagar el día de la cita; nunca negativo (no hay devoluciones). */
export function saldoDe({ price, deposit }: Cotizacion): number | null {
  return price == null ? null : Math.max(0, price - (deposit ?? 0));
}

/** Error con un mensaje que se le puede mostrar a Betsy tal cual. */
export class CitaError extends Error {}

/** Lo que el dominio necesita de la base de datos. */
export interface CitaStore {
  getAppointment(id: string): Promise<Appointment | null>;
  updateAppointment(id: string, patch: Partial<Appointment>): Promise<void>;
}

export function createCitas(store: CitaStore) {
  return {
    /** Betsy ajusta el valor final (cm adicionales, paquete, desplazamiento). */
    async ajustarValor(id: string, { price, travelFee = null }: { price: number; travelFee?: number | null }): Promise<void> {
      const peso = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 100_000_000);
      if (!peso(price)) throw new CitaError('Escribe el valor en pesos, sin puntos ni decimales.');
      if (!peso(travelFee)) throw new CitaError('Escribe el desplazamiento en pesos, sin puntos ni decimales.');
      if (travelFee !== null && travelFee > price) throw new CitaError('El desplazamiento no puede ser mayor que el valor total.');
      const a = await store.getAppointment(id);
      if (!a) throw new CitaError('No encontramos esa cita. Recarga la página.');
      if (a.status === 'cancelada') throw new CitaError('Esta cita está cancelada: ya no se puede cambiar su valor.');
      const patch: Partial<Appointment> = { price, travel_fee: travelFee };
      // Abono ya confirmado: lo pagado no cambia, solo el saldo.
      if (!a.deposit_confirmed_at) patch.deposit = depositOf(price);
      await store.updateAppointment(id, patch);
    },
  };
}
