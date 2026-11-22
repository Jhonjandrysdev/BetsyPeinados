import { describe, expect, it } from 'vitest';
import { normalizarCelular } from './celular';

describe('celular de la clienta', () => {
  it.each([
    ['300 123 4567', '573001234567'],
    ['(300) 123-4567', '573001234567'],
    ['+57 300 123 4567', '573001234567'],
    ['57 300 123 4567', '573001234567'],
    ['+1 305 555 0123', '13055550123'],
    ['+34 612 345 678', '34612345678'],
  ])('acepta %s', (input, esperado) => {
    expect(normalizarCelular(input)).toEqual({ ok: true, phone: esperado });
  });

  it.each([
    ['un fijo de 7 dígitos', '2345678'],
    ['un fijo con indicativo de ciudad', '604 234 5678'],
    ['un fijo colombiano con +57', '+57 604 234 5678'],
    ['un número incompleto', '300 123 456'],
    ['un número internacional muy corto', '+1 555'],
    ['un texto sin números', 'mi celular'],
    ['vacío', ''],
  ])('rechaza %s con un mensaje claro', (_, input) => {
    const r = normalizarCelular(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
  });

  it('a un fijo le explica que debe ser celular', () => {
    const r = normalizarCelular('2345678');
    expect(!r.ok && r.error).toMatch(/celular/i);
  });
});
