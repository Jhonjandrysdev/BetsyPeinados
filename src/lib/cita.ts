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
  /** Cambia con el estado, la hora, los montos o el comprobante: la página de la clienta se recarga al verla distinta. */
  firma: string;
}

type CitaVista = Pick<
  Appointment,
  'status' | 'starts_at' | 'hair_length' | 'price' | 'deposit' | 'travel_fee' | 'deposit_confirmed_at' | 'receipt_path' | 'receipt_rejected_at'
>;

/** Valor, abono y saldo tal como los ven Betsy en el panel y la clienta en su página. */
export function resumenDeCita(a: CitaVista, sv: Tarifa | null | undefined): ResumenCita {
  const v = valorDeCita(a, sv);
  const exacto = v.deposit != null;
  const travel = a.travel_fee ?? 0;
  const cancelada = a.status === 'cancelada';
  const abono = !exacto ? null : a.deposit_confirmed_at ? 'pagado' : a.status === 'pendiente' ? 'por_pagar' : null;
  // Sin abono de por medio (cita creada a mano) se cobra todo el valor el día de la cita.
  const saldo = cancelada || !exacto ? null : abono ? saldoDe(v) : v.price;
  return { ...v, exacto, travel, abono: cancelada && abono === 'por_pagar' ? null : abono, saldo, firma: [a.status, a.starts_at, v.price, v.deposit, travel, a.receipt_path ? 'rev' : '', a.receipt_rejected_at ?? ''].join('|') };
}

/** Comprobante rechazado y la clienta aún no lo sabe (vale también para un segundo rechazo). */
export function debeAvisarRechazo(
  a: Pick<Appointment, 'status' | 'starts_at' | 'receipt_path' | 'receipt_rejected_at' | 'notified'>,
  now: Date,
): boolean {
  if (a.status !== 'pendiente' || a.receipt_path || !a.receipt_rejected_at) return false;
  if (Date.parse(a.starts_at) <= now.getTime()) return false;
  const avisado = a.notified?.comprobante_rechazado;
  return !avisado || Date.parse(avisado) < Date.parse(a.receipt_rejected_at);
}

const HORA = 3_600_000;

/** El sistema liberó el cupo porque venció el plazo del comprobante. */
export const cupoLiberado = (a: Pick<Appointment, 'status' | 'cancel_reason'>) => a.status === 'cancelada' && a.cancel_reason === 'sin_abono';

/** Hasta cuándo tiene la clienta para enviar el comprobante; null si el plazo no corre. */
export function plazoDeAbono(
  a: Pick<Appointment, 'status' | 'created_at' | 'starts_at' | 'receipt_path' | 'receipt_rejected_at' | 'rescheduled_at'>,
): Date | null {
  if (a.status !== 'pendiente' || a.receipt_path) return null;
  // El plazo corre desde lo más reciente: la reserva, el último rechazo del comprobante o el último cambio de hora.
  const desde = Math.max(...[a.created_at, a.receipt_rejected_at, a.rescheduled_at].filter((d): d is string => Boolean(d)).map(Date.parse));
  const inicio = Date.parse(a.starts_at);
  const horas = inicio - desde < 24 * HORA ? 2 : 24;
  return new Date(Math.min(desde + horas * HORA, inicio));
}

/** "2 horas y 30 minutos": lo que le queda a la clienta; null si el plazo ya pasó. */
export function tiempoRestante(plazo: Date, now: Date): string | null {
  const ms = plazo.getTime() - now.getTime();
  if (ms <= 0) return null;
  const min = Math.max(1, Math.ceil(ms / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  const horas = h === 1 ? '1 hora' : `${h} horas`;
  const minutos = m === 1 ? '1 minuto' : `${m} minutos`;
  return h && m ? `${horas} y ${minutos}` : h ? horas : minutos;
}

/** Error con un mensaje que se le puede mostrar a Betsy tal cual. */
export class CitaError extends Error {}

/** Campos de la cita que el dominio escribe. */
export type CitaPatch = Partial<
  Pick<
    Appointment,
    'price' | 'deposit' | 'travel_fee' | 'receipt_path' | 'receipt_at' | 'receipt_rejected_reason' | 'receipt_rejected_at' | 'google_event_id'
  >
>;

/** Lo que el dominio necesita de la base de datos. */
export interface CitaStore {
  getAppointment(id: string): Promise<Appointment | null>;
  updateAppointment(id: string, patch: CitaPatch): Promise<void>;
  /** Actualiza solo si la cita sigue con ese comprobante; false si la clienta subió otro entretanto. */
  updateAppointmentIfReceipt(id: string, receiptPath: string, patch: CitaPatch): Promise<boolean>;
  /** Citas apartadas sin comprobante en revisión (candidatas a vencer). */
  listPendingWithoutReceipt(): Promise<Appointment[]>;
  /** Cancela por falta de abono solo si sigue apartada y sin comprobante; false si la clienta alcanzó a subirlo. */
  expireIfUnpaid(id: string): Promise<boolean>;
  /** Borra el archivo del comprobante del bucket privado. */
  deleteReceipt(path: string): Promise<void>;
}

export interface CitaDeps {
  now: () => Date;
  /** Fallos que no impiden la operación (p. ej. no se pudo borrar un archivo). */
  reportar: (msg: string, e: unknown) => void;
  /** Google Calendar de Betsy (si está conectado). */
  calendario: { cancelar(eventId: string): Promise<void> } | null;
  /** WhatsApp automático (si está conectado): envía el aviso y devuelve si salió. */
  avisar: ((a: Appointment, aviso: 'cupo_liberado') => Promise<boolean>) | null;
}

const DEPS: CitaDeps = { now: () => new Date(), reportar: (msg, e) => console.error(msg, e), calendario: null, avisar: null };

/** Avisos por corrida de la tarea programada: cada envío a Meta puede tardar segundos y la función tiene 15 s. */
const MAX_AVISOS_POR_CORRIDA = 2;

export function createCitas(store: CitaStore, deps: Partial<CitaDeps> = {}) {
  const { now, reportar, calendario, avisar } = { ...DEPS, ...deps };
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
      const patch: CitaPatch = { price };
      // El desplazamiento solo aplica a domicilio; si no se usa, no se toca la columna.
      const travel = a.home_service ? travelFee : null;
      if (travel !== null || a.travel_fee != null) patch.travel_fee = travel;
      // Abono ya confirmado: lo pagado no cambia, solo el saldo.
      if (!a.deposit_confirmed_at) patch.deposit = Math.min(depositOf(price) ?? price, price);
      await store.updateAppointment(id, patch);
    },

    /** Tarea programada (cada 15 min): libera los cupos cuyo plazo para el comprobante ya pasó. Repetirla no cambia nada. */
    async vencerCuposSinAbono(): Promise<{ vencidas: string[]; avisadas: number }> {
      const vencidas: string[] = [];
      let avisadas = 0;
      let intentos = 0;
      for (const a of await store.listPendingWithoutReceipt()) {
        const plazo = plazoDeAbono(a);
        if (!plazo || plazo.getTime() > now().getTime()) continue;
        if (!(await store.expireIfUnpaid(a.id))) continue;
        vencidas.push(a.id);
        if (a.google_event_id && calendario) {
          try {
            await calendario.cancelar(a.google_event_id);
            await store.updateAppointment(a.id, { google_event_id: null });
          } catch (e) {
            reportar('No se pudo borrar de Google Calendar la cita vencida', e);
          }
        }
        // Solo si la cita aún no empieza; los avisos que no salgan aquí quedan en el panel para enviarlos a mano.
        if (avisar && intentos < MAX_AVISOS_POR_CORRIDA && Date.parse(a.starts_at) > now().getTime()) {
          intentos++;
          try {
            if (await avisar({ ...a, status: 'cancelada', cancel_reason: 'sin_abono' }, 'cupo_liberado')) avisadas++;
          } catch (e) {
            reportar('No se pudo enviar el aviso de cupo liberado', e);
          }
        }
      }
      return { vencidas, avisadas };
    },

    /**
     * Betsy rechaza un comprobante falso, borroso o por menos dinero: la cita vuelve a esperar abono.
     * @param comprobanteVisto ruta del comprobante que Betsy revisó (si la clienta subió otro después, no se rechaza). */
    async rechazarComprobante(id: string, motivo: string, comprobanteVisto?: string): Promise<void> {
      const motivoLimpio = motivo.replace(/\s+/g, ' ').trim();
      if (!motivoLimpio) throw new CitaError('Escribe el motivo para que la clienta sepa qué corregir.');
      if (motivoLimpio.length > 200) throw new CitaError('El motivo es muy largo: máximo 200 caracteres.');
      const a = await store.getAppointment(id);
      if (!a) throw new CitaError('No encontramos esa cita. Recarga la página.');
      if (a.status !== 'pendiente' || !a.receipt_path) throw new CitaError('Esta cita no tiene un comprobante en revisión.');
      const otro = new CitaError('La clienta acaba de subir otro comprobante. Revísalo antes de rechazar.');
      if (comprobanteVisto && comprobanteVisto !== a.receipt_path) throw otro;
      const ok = await store.updateAppointmentIfReceipt(id, a.receipt_path, {
        receipt_path: null,
        receipt_at: null,
        receipt_rejected_reason: motivoLimpio,
        receipt_rejected_at: now().toISOString(),
      });
      if (!ok) throw otro;
      // Un archivo huérfano en el bucket privado no afecta a nadie: si falla el borrado, la cita igual queda rechazada.
      await store.deleteReceipt(a.receipt_path).catch((e) => reportar('No se pudo borrar el comprobante', e));
    },
  };
}
