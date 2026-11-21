import { beforeEach, describe, expect, it } from 'vitest';
import { CitaError, createCitas, debeAvisarRechazo, resumenDeCita } from './cita';
import { base, fakeStore } from './cita.fixtures';

const AHORA = new Date('2026-11-22T09:30:00.000Z');
const conComprobante = { ...base, receipt_path: 'c1/123.jpg', receipt_at: '2026-11-21T20:00:00.000Z' };

describe('rechazar comprobante', () => {
  let store: ReturnType<typeof fakeStore>;
  const citas = () => createCitas(store, { now: () => AHORA, reportar: () => {} });
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

  it('no rechaza si la clienta subió otro comprobante después del que Betsy vio', async () => {
    await expect(citas().rechazarComprobante('c1', 'Borroso', 'c1/otro.jpg')).rejects.toThrow(/otro comprobante/);
    expect(store.get('c1')?.receipt_path).toBe('c1/123.jpg');
  });

  it('no rechaza si el comprobante cambió entre la lectura y el guardado', async () => {
    const original = store.getAppointment;
    store.getAppointment = async (id) => {
      const a = await original(id);
      await store.updateAppointment(id, { receipt_path: 'c1/nuevo.jpg' }); // la clienta sube justo ahora
      return a;
    };
    await expect(citas().rechazarComprobante('c1', 'Borroso')).rejects.toThrow(/otro comprobante/);
    expect(store.get('c1')?.receipt_path).toBe('c1/nuevo.jpg');
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

describe('aviso pendiente de comprobante rechazado', () => {
  const rechazada = { ...base, receipt_rejected_at: '2026-11-22T09:30:00.000Z', receipt_rejected_reason: 'Borroso' };
  const antes = new Date('2026-11-22T08:00:00.000Z');

  it('se ofrece tras rechazar si aún no se avisó', () => {
    expect(debeAvisarRechazo(rechazada, antes)).toBe(true);
  });

  it('no se ofrece después de avisar', () => {
    expect(debeAvisarRechazo({ ...rechazada, notified: { comprobante_rechazado: '2026-11-22T09:31:00.000Z' } }, antes)).toBe(false);
  });

  it('se vuelve a ofrecer en un segundo rechazo', () => {
    const segundo = { ...rechazada, receipt_rejected_at: '2026-11-22T12:00:00.000Z', notified: { comprobante_rechazado: '2026-11-22T09:31:00.000Z' } };
    expect(debeAvisarRechazo(segundo, antes)).toBe(true);
  });

  it('compara fechas, no texto (la base puede devolverlas en otra zona horaria)', () => {
    // 04:31 en Bogotá = 09:31 UTC: posterior al rechazo de las 09:30 UTC.
    expect(debeAvisarRechazo({ ...rechazada, notified: { comprobante_rechazado: '2026-11-22T04:31:00-05:00' } }, antes)).toBe(false);
  });

  it('no se ofrece si ya subió uno nuevo, si la cita ya empezó o si no hubo rechazo', () => {
    expect(debeAvisarRechazo({ ...rechazada, receipt_path: 'c1/nuevo.jpg' }, antes)).toBe(false);
    expect(debeAvisarRechazo(rechazada, new Date('2026-12-01T15:05:00.000Z'))).toBe(false);
    expect(debeAvisarRechazo(base, antes)).toBe(false);
  });
});
