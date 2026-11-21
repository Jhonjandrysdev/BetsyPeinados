import { beforeEach, describe, expect, it } from 'vitest';
import { CitaError, createCitas, resumenDeCita } from './cita';
import { base, fakeStore } from './cita.fixtures';

const AHORA = new Date('2026-11-22T09:30:00.000Z');
const conComprobante = { ...base, receipt_path: 'c1/123.jpg', receipt_at: '2026-11-21T20:00:00.000Z' };

describe('rechazar comprobante', () => {
  let store: ReturnType<typeof fakeStore>;
  const citas = () => createCitas(store, { now: () => AHORA });
  beforeEach(() => {
    store = fakeStore([conComprobante]);
  });

  it('vuelve a esperar abono, guarda el motivo y la hora, y borra el archivo', async () => {
    await citas().rechazarComprobante('c1', 'La foto está borrosa');
    expect(store.get('c1')).toMatchObject({
      status: 'pendiente',
      receipt_path: null,
      receipt_at: null,
      receipt_rejected_reason: 'La foto está borrosa',
      receipt_rejected_at: AHORA.toISOString(),
    });
    expect(store.borrados).toEqual(['c1/123.jpg']);
  });

  it('limpia el motivo de espacios de más', async () => {
    await citas().rechazarComprobante('c1', '   Llegó por menos   dinero  ');
    expect(store.get('c1')?.receipt_rejected_reason).toBe('Llegó por menos dinero');
  });

  it.each([
    ['sin motivo', ''],
    ['con un motivo de puros espacios', '    '],
    ['con un motivo de más de 200 caracteres', 'x'.repeat(201)],
  ])('no deja rechazar %s', async (_, motivo) => {
    await expect(citas().rechazarComprobante('c1', motivo)).rejects.toThrow(CitaError);
    expect(store.get('c1')?.receipt_path).toBe('c1/123.jpg');
    expect(store.borrados).toEqual([]);
  });

  it('no deja rechazar si no hay comprobante en revisión', async () => {
    store = fakeStore([base]);
    await expect(citas().rechazarComprobante('c1', 'Borroso')).rejects.toThrow(CitaError);
  });

  it('no deja rechazar si la cita ya no espera abono', async () => {
    store = fakeStore([{ ...conComprobante, status: 'confirmada', deposit_confirmed_at: '2026-11-22T08:00:00.000Z' }]);
    await expect(citas().rechazarComprobante('c1', 'Borroso')).rejects.toThrow(CitaError);
    expect(store.borrados).toEqual([]);
  });

  it('si no se puede borrar el archivo, la cita igual queda rechazada', async () => {
    store.deleteReceipt = async () => {
      throw new Error('storage caído');
    };
    await citas().rechazarComprobante('c1', 'Borroso');
    expect(store.get('c1')).toMatchObject({ receipt_path: null, receipt_rejected_reason: 'Borroso' });
  });
});

describe('la página de la clienta se entera del rechazo', () => {
  it('la firma cambia al subir un comprobante y al rechazarlo', () => {
    const esperando = resumenDeCita(base, null).firma;
    const enRevision = resumenDeCita(conComprobante, null).firma;
    const rechazado = resumenDeCita({ ...base, receipt_rejected_at: AHORA.toISOString() }, null).firma;
    expect(new Set([esperando, enRevision, rechazado]).size).toBe(3);
  });
});
