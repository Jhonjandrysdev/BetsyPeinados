import { describe, expect, it } from 'vitest';
import { plazoDeAbono } from './cita';
import { base } from './cita.fixtures';

const h = (n: number) => n * 3_600_000;
const at = (iso: string) => new Date(iso).getTime();

describe('plazo para enviar el comprobante', () => {
  it('son 24 h desde que se apartó el cupo', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-12-01T15:00:00.000Z' };
    expect(plazoDeAbono(a)?.toISOString()).toBe('2026-11-22T10:00:00.000Z');
  });

  it('son 2 h si la cita empieza en menos de 24 h', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-11-22T08:00:00.000Z' };
    expect(plazoDeAbono(a)?.toISOString()).toBe('2026-11-21T12:00:00.000Z');
  });

  it('nunca pasa de la hora de la cita', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-11-21T11:00:00.000Z' };
    expect(plazoDeAbono(a)?.toISOString()).toBe('2026-11-21T11:00:00.000Z');
  });

  it('vuelve a empezar desde el último rechazo del comprobante', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-12-01T15:00:00.000Z', receipt_rejected_at: '2026-11-23T09:00:00.000Z' };
    expect(plazoDeAbono(a)?.toISOString()).toBe('2026-11-24T09:00:00.000Z');
  });

  it('tras un rechazo cercano a la cita también son 2 h', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-11-25T15:00:00.000Z', receipt_rejected_at: '2026-11-25T01:00:00.000Z' };
    expect(plazoDeAbono(a)?.toISOString()).toBe('2026-11-25T03:00:00.000Z');
  });

  it('no corre mientras haya un comprobante en revisión', () => {
    expect(plazoDeAbono({ ...base, receipt_path: 'c1/1.jpg' })).toBeNull();
  });

  it('no corre si la cita ya no espera abono', () => {
    expect(plazoDeAbono({ ...base, status: 'confirmada' })).toBeNull();
    expect(plazoDeAbono({ ...base, status: 'cancelada' })).toBeNull();
  });

  it('el límite de 24 h es exacto: a 24 h justas ya son 24 h completas', () => {
    const a = { ...base, created_at: '2026-11-21T10:00:00.000Z', starts_at: '2026-11-22T10:00:00.000Z' };
    expect(at(plazoDeAbono(a)!.toISOString()) - at(a.created_at)).toBe(h(24));
  });
});
