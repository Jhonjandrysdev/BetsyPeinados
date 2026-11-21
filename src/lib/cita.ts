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

export interface ResumenCita extends Cotizacion {
  /** Valor exacto (con abono) o solo "desde". */
  exacto: boolean;
  /** Desplazamiento incluido en el valor (0 si no hay). */
  travel: number;
  /** Estado del abono que se muestra; null si no aplica (cita creada a mano, cancelada sin abono o valor no exacto). */
  abono: 'por_pagar' | 'pagado' | null;
  /** Lo que se cobra el día de la cita; null si no aplica. */
  saldo: number | null;
  /** Cambia cuando cambian el estado o los montos: la página de la clienta se recarga al verla distinta. */
  firma: string;
}

type CitaVista = Pick<Appointment, 'status' | 'hair_length' | 'price' | 'deposit' | 'travel_fee' | 'deposit_confirmed_at'>;

/** Valor, abono y saldo tal como los ven Betsy en el panel y la clienta en su página. */
export function resumenDeCita(a: CitaVista, sv: Tarifa | null | undefined): ResumenCita {
  const v = valorDeCita(a, sv);
  const exacto = v.deposit != null;
  const travel = a.travel_fee ?? 0;
  const cancelada = a.status === 'cancelada';
  const abono = !exacto ? null : a.deposit_confirmed_at ? 'pagado' : a.status === 'pendiente' ? 'por_pagar' : null;
  // Sin abono de por medio (cita creada a mano) se cobra todo el valor el día de la cita.
  const saldo = cancelada || !exacto ? null : abono ? saldoDe(v) : v.price;
  return { ...v, exacto, travel, abono: cancelada && abono === 'por_pagar' ? null : abono, saldo, firma: [a.status, v.price, v.deposit, travel].join('|') };
}

/** Error con un mensaje que se le puede mostrar a Betsy tal cual. */
export class CitaError extends Error {}

/** Lo que el dominio necesita de la base de datos. */
export interface CitaStore {
  getAppointment(id: string): Promise<Appointment | null>;
  updateAppointment(id: string, patch: Partial<Pick<Appointment, 'price' | 'deposit' | 'travel_fee'>>): Promise<void>;
}

export function createCitas(store: CitaStore) {
  return {
    /** Betsy ajusta el valor final (cm adicionales, paquete, desplazamiento). */
    async ajustarValor(id: string, { price, travelFee = null }: { price: number; travelFee?: number | null }): Promise<void> {
      const esPesoValido = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0 && n <= 100_000_000);
      if (!esPesoValido(price) || price <= 0) throw new CitaError('Escribe el valor en pesos, sin decimales. Debe ser mayor que cero.');
      if (!esPesoValido(travelFee)) throw new CitaError('Escribe el desplazamiento en pesos, sin decimales.');
      if (travelFee !== null && travelFee > price) throw new CitaError('El desplazamiento no puede ser mayor que el valor total.');
      const a = await store.getAppointment(id);
      if (!a) throw new CitaError('No encontramos esa cita. Recarga la página.');
      if (a.status === 'cancelada') throw new CitaError('Esta cita está cancelada: ya no se puede cambiar su valor.');
      const patch: Parameters<CitaStore['updateAppointment']>[1] = { price };
      // El desplazamiento solo aplica a domicilio; si no se usa, no se toca la columna.
      const travel = a.home_service ? travelFee : null;
      if (travel !== null || a.travel_fee != null) patch.travel_fee = travel;
      // Abono ya confirmado: lo pagado no cambia, solo el saldo.
      if (!a.deposit_confirmed_at) patch.deposit = Math.min(depositOf(price) ?? price, price);
      await store.updateAppointment(id, patch);
    },
  };
}
