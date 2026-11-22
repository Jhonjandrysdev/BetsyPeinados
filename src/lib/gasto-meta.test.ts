import { describe, expect, it } from 'vitest';
import { TASA_USD_COP_DEFECTO, gastoEnPesos } from './gasto-meta';

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
