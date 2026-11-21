import { describe, expect, it } from 'vitest';
import { cotizar, valorDeCita } from './cita';

const ondas = { price_from: 70000, price_short: 70000, price_medium: 80000, price_long: 90000 };

describe('cotizar al reservar', () => {
  it('usa el precio del largo elegido y abona el 50%', () => {
    expect(cotizar(ondas, 'medio')).toEqual({ price: 80000, deposit: 40000 });
  });

  it('sin largo elegido guarda el "desde" pero no fija abono (Betsy lo ajusta)', () => {
    expect(cotizar(ondas, null)).toEqual({ price: 70000, deposit: null });
  });

  it('servicio que se cotiza aparte queda sin valor ni abono', () => {
    const paquete = { price_from: null, price_short: null, price_medium: null, price_long: null };
    expect(cotizar(paquete, 'corto')).toEqual({ price: null, deposit: null });
    expect(cotizar(null, null)).toEqual({ price: null, deposit: null });
  });

  it('redondea el abono a miles', () => {
    const raro = { price_from: 75000, price_short: 75000, price_medium: 85000, price_long: 95000 };
    expect(cotizar(raro, 'corto')).toEqual({ price: 75000, deposit: 38000 });
  });

  it('si falta la tarifa de un largo usa la del largo anterior', () => {
    const solo = { price_from: 60000, price_short: 60000, price_medium: null, price_long: null };
    expect(cotizar(solo, 'extra')).toEqual({ price: 60000, deposit: 30000 });
  });
});

describe('valor de una cita', () => {
  const cita = { hair_length: 'medio' };

  it('usa el valor guardado aunque los precios del servicio hayan cambiado', () => {
    const subio = { ...ondas, price_medium: 95000 };
    expect(valorDeCita({ ...cita, price: 80000, deposit: 40000 }, subio)).toEqual({ price: 80000, deposit: 40000 });
  });

  it('una cita guardada sin valor sigue sin valor', () => {
    expect(valorDeCita({ ...cita, price: null, deposit: null }, ondas)).toEqual({ price: null, deposit: null });
  });

  it('si la base aún no tiene las columnas, calcula como antes', () => {
    expect(valorDeCita(cita, ondas)).toEqual({ price: 80000, deposit: 40000 });
  });
});
