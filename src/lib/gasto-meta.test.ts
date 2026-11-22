import { describe, expect, it } from 'vitest';
import { TASA_USD_COP_DEFECTO, gastoEnPesos, leerPesos, leerTasa } from './gasto-meta';

describe('gasto real de Meta en pesos', () => {
  it('en dólares: aproximado en COP con la tasa de Betsy, redondeado al peso', () => {
    expect(gastoEnPesos({ monto: 0.0123, moneda: 'USD' }, 4000)).toEqual({ monto: 0.0123, moneda: 'USD', cop: 49, aproximado: true });
  });

  it('si la cuenta factura en pesos, se muestra directo sin conversión', () => {
    expect(gastoEnPesos({ monto: 1520, moneda: 'COP' }, 4000)).toEqual({ monto: 1520, moneda: 'COP', cop: 1520, aproximado: false });
  });

  it('la moneda se compara sin importar mayúsculas', () => {
    expect(gastoEnPesos({ monto: 2, moneda: 'usd' }, 4000)).toMatchObject({ moneda: 'USD', cop: 8000 });
  });

  it('otra moneda: no hay aproximado en pesos', () => {
    expect(gastoEnPesos({ monto: 3, moneda: 'EUR' }, 4000)).toEqual({ monto: 3, moneda: 'EUR', cop: null, aproximado: false });
  });

  it('sin tasa válida usa la de por defecto', () => {
    expect(gastoEnPesos({ monto: 1, moneda: 'USD' }, 0).cop).toBe(TASA_USD_COP_DEFECTO);
    expect(gastoEnPesos({ monto: 1, moneda: 'USD' }, Number.NaN).cop).toBe(TASA_USD_COP_DEFECTO);
  });
});

describe('tasa del dólar escrita por Betsy', () => {
  it.each([
    ['4000', 4000],
    ['4.000', 4000],
    ['4,000', 4000],
    ['4 000', 4000],
    ['3950,5', 3951],
    ['3950.5', 3951],
    ['4.000,50', 4001],
    ['4,000.50', 4001],
  ])('«%s» es %d pesos', (texto, esperado) => {
    expect(leerTasa(texto)).toBe(esperado);
  });

  it.each([[''], ['abc'], ['40'], ['50.000'], ['-4000']])('«%s» no es una tasa válida', (texto) => {
    expect(leerTasa(texto)).toBeNull();
  });
});

describe('moneda que Meta no informó', () => {
  it('no se convierte a pesos', () => {
    expect(gastoEnPesos({ monto: 2, moneda: null }, 4000)).toEqual({ monto: 2, moneda: null, cop: null, aproximado: false });
  });
});

describe('pesos escritos por Betsy (tope mensual)', () => {
  it.each([
    ['20000', 20000],
    ['20.000', 20000],
    ['20,000', 20000],
    ['$20.000', 20000],
    ['$ 1.500.000', 1500000],
  ])('«%s» son %d pesos', (texto, esperado) => {
    expect(leerPesos(texto)).toBe(esperado);
  });

  it.each([['abc'], ['20.5'], ['-500'], ['']])('«%s» no son pesos enteros', (texto) => {
    expect(leerPesos(texto)).toBeNull();
  });
});
