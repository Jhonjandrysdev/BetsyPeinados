import { describe, expect, it } from 'vitest';
import { compararGasto, resumenDeUso } from './uso-whatsapp';
import type { WaMessage } from './types';

let n = 0;
const msg = (p: Partial<WaMessage>): WaMessage => ({
  id: ++n,
  appointment_id: 'c1',
  phone: '573001234567',
  direction: 'out',
  event: 'abono',
  body: 'Hola',
  kind: 'plantilla',
  status: 'enviado',
  error: null,
  wa_message_id: `wamid.${n}`,
  billable: null,
  category: null,
  created_at: '2026-11-10T15:00:00.000Z',
  ...p,
});

describe('resumen de uso de WhatsApp del mes', () => {
  const mes = [
    msg({ status: 'leido', billable: true }),
    msg({ status: 'entregado', billable: true, event: 'recordatorio' }),
    msg({ status: 'entregado', kind: 'texto', billable: false, event: 'libre' }),
    msg({ status: 'enviado' }), // Meta aún no informó si se cobra: plantilla = cobrada
    msg({ status: 'fallido', error: 'token vencido', appointment_id: 'c2' }),
    msg({ status: 'bloqueado', kind: 'texto', error: 'Sin permiso', appointment_id: 'c3', event: 'cupo_liberado' }),
    msg({ status: 'manual', kind: 'texto' }),
    msg({ direction: 'in', status: 'recibido', kind: 'texto', body: 'Confirmo', billable: null }),
    msg({ direction: 'in', status: 'recibido', kind: 'texto', body: 'gracias' }),
  ];
  const r = resumenDeUso(mes, 4);

  it('cuenta enviados, cobrados y gratis (sin fallidos, bloqueados ni manuales)', () => {
    expect(r).toMatchObject({ enviados: 4, cobrados: 3, gratis: 1 });
  });

  it('gasto estimado = mensajes cobrados × tarifa', () => {
    expect(r.estimado).toBe(12);
  });

  it('cuenta por estado: entregados incluye los leídos', () => {
    expect(r.porEstado).toEqual({ entregados: 3, leidos: 1, fallidos: 1, bloqueados: 1 });
  });

  it('cuenta mensajes recibidos y respuestas «Confirmo»', () => {
    expect(r).toMatchObject({ recibidos: 2, confirmo: 1 });
  });

  it('agrupa por tipo de mensaje', () => {
    expect(r.porEvento).toEqual([
      { event: 'abono', enviados: 2, cobrados: 2 },
      { event: 'recordatorio', enviados: 1, cobrados: 1 },
      { event: 'libre', enviados: 1, cobrados: 0 },
    ]);
  });

  it('lista los avisos que no salieron (fallidos y bloqueados), el más reciente primero', () => {
    const r2 = resumenDeUso([...mes, msg({ status: 'fallido', created_at: '2026-11-20T15:00:00.000Z', appointment_id: 'c4' })], 4);
    expect(r2.noSalieron.map((m) => m.appointment_id)).toEqual(['c4', 'c2', 'c3']);
  });

  it('un mensaje que falló no se cobra aunque Meta lo marque como cobrable', () => {
    expect(resumenDeUso([msg({ status: 'fallido', billable: true })], 4)).toMatchObject({ enviados: 0, cobrados: 0, estimado: 0 });
  });

  it('un mes sin mensajes da todo en cero', () => {
    expect(resumenDeUso([], 4)).toMatchObject({ enviados: 0, cobrados: 0, estimado: 0, noSalieron: [], porEvento: [] });
  });
});

describe('comparación con el mes anterior', () => {
  it('diferencia y porcentaje', () => {
    expect(compararGasto(150, 100)).toEqual({ diferencia: 50, porcentaje: 50 });
    expect(compararGasto(75, 100)).toEqual({ diferencia: -25, porcentaje: -25 });
  });

  it('sin gasto el mes anterior no hay porcentaje', () => {
    expect(compararGasto(30, 0)).toEqual({ diferencia: 30, porcentaje: null });
  });
});
