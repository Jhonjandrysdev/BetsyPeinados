/** Celular para WhatsApp: colombiano (10 dígitos que empiezan por 3) o con indicativo internacional. */
export type CelularValidado = { ok: true; phone: string } | { ok: false; error: string };

const COLOMBIA = /^573\d{9}$/;
/** Dígitos mínimos de un número con indicativo internacional (también lo exige el envío por WhatsApp). */
export const MIN_DIGITOS_INTERNACIONAL = 8;

/** Devuelve el número sin "+" ni espacios (ej. 573001234567), o por qué no sirve. */
export function normalizarCelular(raw: string): CelularValidado {
  const s = String(raw ?? '').replace(/[^\d+]/g, '');
  const digits = s.replace(/\D/g, '');
  if (!digits) return { ok: false, error: 'Escribe el número de celular con WhatsApp. Ej.: 300 123 4567' };

  if (s.startsWith('+')) {
    if (digits.startsWith('57')) return COLOMBIA.test(digits) ? { ok: true, phone: digits } : noEsCelular();
    return digits.length >= MIN_DIGITOS_INTERNACIONAL && digits.length <= 15
      ? { ok: true, phone: digits }
      : { ok: false, error: 'Revisa el número internacional: escribe el indicativo del país y el número completo. Ej.: +1 305 555 0123' };
  }
  if (digits.length === 10 && digits.startsWith('3')) return { ok: true, phone: `57${digits}` };
  if (COLOMBIA.test(digits)) return { ok: true, phone: digits };
  return noEsCelular();
}

const noEsCelular = (): CelularValidado => ({
  ok: false,
  error: 'Escribe un número de celular de 10 dígitos que empiece por 3 (los fijos no reciben WhatsApp). Si es de otro país, empieza con + y el indicativo.',
});
