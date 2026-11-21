import { beforeEach, describe, expect, it } from 'vitest';
import { CitaError, createCitas, resumenDeCita, saldoDe } from './cita';
import { base, fakeStore } from './cita.fixtures';

describe('ajustar el valor final', () => {
  let store: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    store = fakeStore([base, { ...base, id: 'c2', status: 'confirmada', deposit_confirmed_at: '2026-11-21T12:00:00.000Z' }]);
  });

  it('antes de confirmar el abono, recalcula el abono al 50% del valor final', async () => {
    await createCitas(store).ajustarValor('c1', { price: 95000 });
    expect(store.get('c1')).toMatchObject({ price: 95000, deposit: 48000 });
  });

  it('después de confirmar el abono, el abono queda fijo y solo cambia el valor', async () => {
    await createCitas(store).ajustarValor('c2', { price: 100000 });
    expect(store.get('c2')).toMatchObject({ price: 100000, deposit: 40000 });
  });

  it('guarda el desplazamiento como parte del valor y el abono cubre el total', async () => {
    store = fakeStore([{ ...base, home_service: true, home_address: 'Calle 1 # 2-3' }]);
    await createCitas(store).ajustarValor('c1', { price: 100000, travelFee: 20000 });
    expect(store.get('c1')).toMatchObject({ price: 100000, travel_fee: 20000, deposit: 50000 });
  });

  it('servicio sin precio: al fijar el valor la clienta ya tiene abono que pagar', async () => {
    store = fakeStore([{ ...base, price: null, deposit: null }]);
    await createCitas(store).ajustarValor('c1', { price: 150000 });
    expect(store.get('c1')).toMatchObject({ price: 150000, deposit: 75000 });
  });

  it.each([
    ['un valor negativo', { price: -1 }],
    ['un valor no entero', { price: 1.5 }],
    ['un desplazamiento mayor que el valor', { price: 50000, travelFee: 60000 }],
    ['un desplazamiento negativo', { price: 50000, travelFee: -5 }],
  ])('rechaza %s sin tocar la cita', async (_, input) => {
    await expect(createCitas(store).ajustarValor('c1', input)).rejects.toThrow(CitaError);
    expect(store.get('c1')).toMatchObject({ price: 80000, deposit: 40000 });
  });

  it('rechaza un valor de cero', async () => {
    await expect(createCitas(store).ajustarValor('c1', { price: 0 })).rejects.toThrow(CitaError);
  });

  it('el abono nunca supera el valor', async () => {
    await createCitas(store).ajustarValor('c1', { price: 1000 });
    expect(store.get('c1')).toMatchObject({ price: 1000, deposit: 1000 });
    await createCitas(store).ajustarValor('c1', { price: 1400 });
    expect(store.get('c1')?.deposit).toBeLessThanOrEqual(1400);
  });

  it('ignora el desplazamiento si la cita no es a domicilio', async () => {
    await createCitas(store).ajustarValor('c1', { price: 90000, travelFee: 10000 });
    expect(store.get('c1')?.travel_fee ?? null).toBeNull();
  });

  it('no deja ajustar una cita cancelada', async () => {
    store = fakeStore([{ ...base, status: 'cancelada' }]);
    await expect(createCitas(store).ajustarValor('c1', { price: 90000 })).rejects.toThrow(CitaError);
  });
});

describe('saldo', () => {
  it('es el valor menos el abono', () => {
    expect(saldoDe({ price: 95000, deposit: 48000 })).toBe(47000);
  });

  it('nunca es negativo: si el valor baja del abono no hay devolución', () => {
    expect(saldoDe({ price: 30000, deposit: 40000 })).toBe(0);
  });

  it('sin valor no hay saldo que mostrar', () => {
    expect(saldoDe({ price: null, deposit: null })).toBeNull();
  });
});

describe('resumen de la cita (lo que ven Betsy y la clienta)', () => {
  const sv = null;

  it('cupo apartado: abono por pagar y saldo después del abono', () => {
    expect(resumenDeCita(base, sv)).toMatchObject({ price: 80000, deposit: 40000, abono: 'por_pagar', saldo: 40000, exacto: true });
  });

  it('abono confirmado: abono pagado y saldo', () => {
    const a = { ...base, status: 'confirmada' as const, deposit_confirmed_at: '2026-11-21T12:00:00.000Z' };
    expect(resumenDeCita(a, sv)).toMatchObject({ abono: 'pagado', saldo: 40000 });
  });

  it('cita creada a mano sin abono: se cobra todo el valor el día de la cita', () => {
    const a = { ...base, status: 'confirmada' as const, source: 'admin' as const };
    expect(resumenDeCita(a, sv)).toMatchObject({ abono: null, saldo: 80000 });
  });

  it('cita cancelada: no hay saldo que cobrar', () => {
    expect(resumenDeCita({ ...base, status: 'cancelada' }, sv)).toMatchObject({ abono: null, saldo: null });
  });

  it('valor solo "desde": no es exacto y no hay abono ni saldo', () => {
    expect(resumenDeCita({ ...base, deposit: null }, sv)).toMatchObject({ exacto: false, abono: null, saldo: null });
  });

  it('incluye el desplazamiento', () => {
    expect(resumenDeCita({ ...base, travel_fee: 15000 }, sv).travel).toBe(15000);
  });

  it('la firma cambia cuando cambian el estado o los montos (la página se actualiza sola)', () => {
    const f = resumenDeCita(base, sv).firma;
    expect(resumenDeCita({ ...base, price: 90000 }, sv).firma).not.toBe(f);
    expect(resumenDeCita({ ...base, status: 'confirmada' }, sv).firma).not.toBe(f);
    expect(resumenDeCita({ ...base, travel_fee: 5000 }, sv).firma).not.toBe(f);
    expect(resumenDeCita({ ...base, starts_at: '2026-12-02T15:00:00.000Z' }, sv).firma).not.toBe(f);
    expect(resumenDeCita({ ...base }, sv).firma).toBe(f);
  });
});
