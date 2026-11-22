/**
 * Uso de WhatsApp del mes: cuántos mensajes salieron, cuántos se cobran, cuáles no llegaron y cuánto se estima gastar.
 * Puro: recibe los mensajes ya leídos de la base.
 */
import { noSalio } from './aviso';
import type { WaMessage } from './types';

/** Mensajes enviados y cobrados de un tipo (abono, recordatorio, respuestas libres…). */
export interface UsoPorEvento {
  event: string;
  enviados: number;
  cobrados: number;
}

export interface ResumenUso {
  /** Mensajes que salieron hacia la clienta (sin fallidos, bloqueados ni los marcados a mano). */
  enviados: number;
  cobrados: number;
  /** Dentro de la ventana de 24 h: no se cobran. */
  gratis: number;
  recibidos: number;
  /** Respuestas «Confirmo» de las clientas. */
  confirmo: number;
  /** Mensajes cobrados × tarifa por mensaje (pesos). */
  estimado: number;
  porEstado: { entregados: number; leidos: number; fallidos: number; bloqueados: number };
  porEvento: UsoPorEvento[];
  /** Avisos que no le llegaron a la clienta, el más reciente primero: Betsy los puede enviar a mano. */
  noSalieron: WaMessage[];
}

// Cobrado: lo que Meta marcó como cobrable; si aún no lo informó, toda plantilla que salió se cuenta como cobrada.
const esCobrado = (m: WaMessage) => m.billable === true || (m.billable == null && m.kind === 'plantilla');

export function resumenDeUso(mensajes: WaMessage[], tarifa: number): ResumenUso {
  const salientes = mensajes.filter((m) => m.direction === 'out');
  const enviados = salientes.filter((m) => m.status !== 'manual' && !noSalio(m));
  const cobrados = enviados.filter(esCobrado);
  const recibidos = mensajes.filter((m) => m.direction === 'in');

  const porEvento = new Map<string, UsoPorEvento>();
  for (const m of enviados) {
    const event = m.event ?? 'libre';
    const e = porEvento.get(event) ?? { event, enviados: 0, cobrados: 0 };
    e.enviados++;
    if (esCobrado(m)) e.cobrados++;
    porEvento.set(event, e);
  }

  const cuenta = (...estados: WaMessage['status'][]) => salientes.filter((m) => estados.includes(m.status)).length;
  return {
    enviados: enviados.length,
    cobrados: cobrados.length,
    gratis: enviados.length - cobrados.length,
    recibidos: recibidos.length,
    confirmo: recibidos.filter((m) => /^confirmo$/i.test(m.body.trim())).length,
    estimado: cobrados.length * tarifa,
    porEstado: { entregados: cuenta('entregado', 'leido'), leidos: cuenta('leido'), fallidos: cuenta('fallido'), bloqueados: cuenta('bloqueado') },
    porEvento: [...porEvento.values()],
    noSalieron: salientes.filter(noSalio).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  };
}

/** Diferencia del gasto con el mes anterior; sin gasto previo no hay porcentaje que mostrar. */
export function compararGasto(actual: number, anterior: number): { diferencia: number; porcentaje: number | null } {
  return { diferencia: actual - anterior, porcentaje: anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null };
}
