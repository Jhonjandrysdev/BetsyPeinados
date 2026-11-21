import { beforeEach, describe, expect, it } from 'vitest';
import { createCitas } from './cita';
import { base, fakeStore } from './cita.fixtures';

// Cita apartada el 21/11 a las 10:00 UTC para el 1/12: vence el 22/11 a las 10:00 UTC.
const apartada = { ...base, created_at: '2026-11-21T10:00:00.000Z' };
const ANTES = new Date('2026-11-22T09:59:00.000Z');
const DESPUES = new Date('2026-11-22T10:01:00.000Z');

describe('vencimiento automático de cupos sin abono', () => {
  let store: ReturnType<typeof fakeStore>;
  let canceladosEnGoogle: string[];
  const tick = (now: Date) =>
    createCitas(store, { now: () => now, reportar: () => {}, calendario: { cancelar: async (id) => void canceladosEnGoogle.push(id) } }).vencerCuposSinAbono();

  beforeEach(() => {
    canceladosEnGoogle = [];
    store = fakeStore([apartada]);
  });

  it('no toca el cupo antes del plazo', async () => {
    expect(await tick(ANTES)).toEqual({ vencidas: [] });
    expect(store.get('c1')?.status).toBe('pendiente');
  });

  it('pasado el plazo, cancela la cita por falta de abono y libera el horario', async () => {
    expect(await tick(DESPUES)).toEqual({ vencidas: ['c1'] });
    expect(store.get('c1')).toMatchObject({ status: 'cancelada', cancel_reason: 'sin_abono' });
  });

  it('no vence mientras haya un comprobante en revisión', async () => {
    store = fakeStore([{ ...apartada, receipt_path: 'c1/1.jpg' }]);
    expect(await tick(DESPUES)).toEqual({ vencidas: [] });
    expect(store.get('c1')?.status).toBe('pendiente');
  });

  it('tras un rechazo el plazo vuelve a empezar', async () => {
    store = fakeStore([{ ...apartada, receipt_rejected_at: '2026-11-22T08:00:00.000Z' }]);
    expect(await tick(DESPUES)).toEqual({ vencidas: [] });
    expect(await tick(new Date('2026-11-23T08:01:00.000Z'))).toEqual({ vencidas: ['c1'] });
  });

  it('con la cita cercana el plazo es de 2 h', async () => {
    store = fakeStore([{ ...apartada, starts_at: '2026-11-22T08:00:00.000Z', ends_at: '2026-11-22T09:30:00.000Z' }]);
    expect(await tick(new Date('2026-11-21T11:59:00.000Z'))).toEqual({ vencidas: [] });
    expect(await tick(new Date('2026-11-21T12:01:00.000Z'))).toEqual({ vencidas: ['c1'] });
  });

  it('correrlo dos veces no cambia nada más', async () => {
    await tick(DESPUES);
    expect(await tick(DESPUES)).toEqual({ vencidas: [] });
  });

  it('borra la cita vencida de Google Calendar', async () => {
    store = fakeStore([{ ...apartada, google_event_id: 'g1' }]);
    await tick(DESPUES);
    expect(canceladosEnGoogle).toEqual(['g1']);
    expect(store.get('c1')?.google_event_id).toBeNull();
  });

  it('si Google falla, la cita igual queda liberada', async () => {
    store = fakeStore([{ ...apartada, google_event_id: 'g1' }]);
    const r = await createCitas(store, {
      now: () => DESPUES,
      reportar: () => {},
      calendario: {
        cancelar: async () => {
          throw new Error('google caído');
        },
      },
    }).vencerCuposSinAbono();
    expect(r).toEqual({ vencidas: ['c1'] });
    expect(store.get('c1')).toMatchObject({ status: 'cancelada', google_event_id: 'g1' });
  });

  it('si la clienta sube el comprobante justo antes de vencer, no se cancela', async () => {
    const lista = store.listPendingWithoutReceipt;
    store.listPendingWithoutReceipt = async () => {
      const r = await lista();
      await store.updateAppointment('c1', { receipt_path: 'c1/justo.jpg' });
      return r;
    };
    expect(await tick(DESPUES)).toEqual({ vencidas: [] });
    expect(store.get('c1')?.status).toBe('pendiente');
  });

  it('no toca citas confirmadas', async () => {
    store = fakeStore([{ ...apartada, status: 'confirmada', deposit_confirmed_at: '2026-11-21T11:00:00.000Z' }]);
    expect(await tick(DESPUES)).toEqual({ vencidas: [] });
  });
});
