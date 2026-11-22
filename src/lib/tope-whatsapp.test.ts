import { describe, expect, it } from 'vitest';
import { estadoTope, estadoTopeDesdeGasto, inicioDelMes } from './tope-whatsapp';
import type { WaMessage } from './types';

let n = 0;
/** Plantilla cobrada enviada en la fecha dada. */
const cobrado = (created_at: string, p: Partial<WaMessage> = {}): WaMessage => ({
  id: ++n,
  appointment_id: 'c1',
  phone: '573001234567',
  direction: 'out',
  event: 'abono',
  body: 'Hola',
  kind: 'plantilla',
  status: 'entregado',
  error: null,
  wa_message_id: `wamid.${n}`,
  billable: true,
  category: 'utility',
  created_at,
  ...p,
});
const varios = (k: number, fecha = '2026-11-10T15:00:00.000Z') => Array.from({ length: k }, () => cobrado(fecha));
const AHORA = new Date('2026-11-22T15:00:00.000Z');

describe('tope mensual de WhatsApp (contra el gasto estimado)', () => {
  it('sin tope no hay límite', () => {
    expect(estadoTope({ mensajes: varios(50), tarifa: 4, tope: null, ahora: AHORA })).toMatchObject({ nivel: 'sin_tope', porcentaje: null });
  });

  it('bajo el tope: normal', () => {
    expect(estadoTope({ mensajes: varios(10), tarifa: 4, tope: 100, ahora: AHORA })).toEqual({ nivel: 'normal', gastado: 40, tope: 100, porcentaje: 40 });
  });

  it('al 80 %: aviso en el panel, los avisos siguen saliendo', () => {
    expect(estadoTope({ mensajes: varios(20), tarifa: 4, tope: 100, ahora: AHORA })).toMatchObject({ nivel: 'aviso', porcentaje: 80 });
  });

  it('al llegar al tope: agotado (se bloquean las plantillas)', () => {
    expect(estadoTope({ mensajes: varios(25), tarifa: 4, tope: 100, ahora: AHORA })).toMatchObject({ nivel: 'agotado', porcentaje: 100 });
    expect(estadoTope({ mensajes: varios(30), tarifa: 4, tope: 100, ahora: AHORA })).toMatchObject({ nivel: 'agotado', porcentaje: 120 });
  });

  it('los mensajes gratis, fallidos y bloqueados no cuentan', () => {
    const mensajes = [
      ...varios(5),
      cobrado('2026-11-10T15:00:00.000Z', { kind: 'texto', billable: false }),
      cobrado('2026-11-10T15:00:00.000Z', { status: 'fallido' }),
      cobrado('2026-11-10T15:00:00.000Z', { status: 'bloqueado' }),
    ];
    expect(estadoTope({ mensajes, tarifa: 4, tope: 100, ahora: AHORA }).gastado).toBe(20);
  });

  it('al cambiar de mes (hora de Colombia) se reinicia: lo del mes anterior no cuenta', () => {
    const noviembre = varios(30, '2026-11-30T15:00:00.000Z');
    // 1 de diciembre 00:30 en Colombia = 05:30 UTC.
    const diciembre = new Date('2026-12-01T05:30:00.000Z');
    expect(estadoTope({ mensajes: noviembre, tarifa: 4, tope: 100, ahora: diciembre })).toMatchObject({ nivel: 'normal', gastado: 0 });
    // 30 de noviembre 23:30 en Colombia (1 de diciembre 04:30 UTC) todavía es noviembre.
    const finDeNoviembre = [...noviembre, cobrado('2026-12-01T04:30:00.000Z')];
    expect(estadoTope({ mensajes: finDeNoviembre, tarifa: 4, tope: 100, ahora: diciembre }).gastado).toBe(0);
    expect(estadoTope({ mensajes: finDeNoviembre, tarifa: 4, tope: 100, ahora: new Date('2026-12-01T04:45:00.000Z') }).gastado).toBe(124);
  });

  it('el mes empieza a la medianoche de Colombia', () => {
    expect(inicioDelMes(new Date('2026-12-01T04:59:00.000Z')).toISOString()).toBe('2026-11-01T05:00:00.000Z');
    expect(inicioDelMes(new Date('2026-12-01T05:00:00.000Z')).toISOString()).toBe('2026-12-01T05:00:00.000Z');
  });

  it('el estado se puede calcular desde el gasto ya contado (lo que usa el envío real)', () => {
    expect(estadoTopeDesdeGasto(79, 100)).toMatchObject({ nivel: 'normal', porcentaje: 79 });
    expect(estadoTopeDesdeGasto(80, 100)).toMatchObject({ nivel: 'aviso' });
    expect(estadoTopeDesdeGasto(100, 100)).toMatchObject({ nivel: 'agotado' });
    expect(estadoTopeDesdeGasto(100, null)).toMatchObject({ nivel: 'sin_tope' });
  });
});
