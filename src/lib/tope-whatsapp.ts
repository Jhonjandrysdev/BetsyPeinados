/**
 * Tope mensual de gasto en WhatsApp: se compara contra el gasto estimado del mes (hora de Colombia).
 * Al 80 % se avisa en el panel; al 100 % se bloquean las plantillas (lo que se cobra). Puro.
 */
import { fromLocal, localDate } from './time';
import { resumenDeUso } from './uso-whatsapp';
import type { WaMessage } from './types';

export const AVISO_TOPE_PCT = 80;

export type EstadoTope =
  | { nivel: 'sin_tope'; gastado: number; tope: null; porcentaje: null }
  | { nivel: 'normal' | 'aviso' | 'agotado'; gastado: number; tope: number; porcentaje: number };

/** Medianoche del día 1 del mes en curso, hora de Colombia. */
export const inicioDelMes = (ahora: Date) => fromLocal(`${localDate(ahora).slice(0, 7)}-01`, '00:00');

export function estadoTope({ mensajes, tarifa, tope, ahora }: { mensajes: WaMessage[]; tarifa: number; tope: number | null; ahora: Date }): EstadoTope {
  const desde = inicioDelMes(ahora).getTime();
  const delMes = mensajes.filter((m) => Date.parse(m.created_at) >= desde && Date.parse(m.created_at) <= ahora.getTime());
  const gastado = resumenDeUso(delMes, tarifa).estimado;
  if (tope == null || !(tope > 0)) return { nivel: 'sin_tope', gastado, tope: null, porcentaje: null };
  const porcentaje = Math.round((gastado / tope) * 100);
  const nivel = gastado >= tope ? 'agotado' : porcentaje >= AVISO_TOPE_PCT ? 'aviso' : 'normal';
  return { nivel, gastado, tope, porcentaje };
}
