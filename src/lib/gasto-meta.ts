/** Gasto real que reporta Meta, llevado a pesos colombianos para que Betsy lo entienda de un vistazo. Puro. */

/** Tasa aproximada del dólar en pesos si Betsy no puso una. */
export const TASA_USD_COP_DEFECTO = 4000;
/** Rango aceptado para la tasa (el mismo check que tiene la columna wa_usd_cop). */
export const TASA_MIN = 1000;
export const TASA_MAX = 20000;

export interface GastoMeta {
  monto: number;
  /** Código ISO de la moneda en que factura la cuenta de WhatsApp (USD, COP…); null si Meta no la informó. */
  moneda: string | null;
}

export interface GastoEnPesos extends GastoMeta {
  /** Valor en pesos; null si la moneda no es USD ni COP (o no se conoce). */
  cop: number | null;
  /** true si los pesos salen de convertir con la tasa (no es lo que cobra Meta exactamente). */
  aproximado: boolean;
}

export function gastoEnPesos({ monto, moneda }: GastoMeta, tasaUsdCop: number): GastoEnPesos {
  const m = moneda?.toUpperCase() ?? null;
  if (m === 'COP') return { monto, moneda: m, cop: monto, aproximado: false };
  if (m !== 'USD') return { monto, moneda: m, cop: null, aproximado: false };
  const tasa = Number.isFinite(tasaUsdCop) && tasaUsdCop > 0 ? tasaUsdCop : TASA_USD_COP_DEFECTO;
  return { monto, moneda: m, cop: Math.round(monto * tasa), aproximado: true };
}

/**
 * Número tal como lo escribe Betsy ("4.000", "4,000", "3950,5", "$20.000"…).
 * Con los dos separadores, el último es el decimal; con uno solo, seguido de exactamente 3 cifras es de miles.
 */
function numeroEscrito(texto: string): number | null {
  let s = texto.replace(/[\s$]/g, '');
  if (!/^\d[\d.,]*$/.test(s)) return null;
  const ultimo = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
  if (s.includes('.') && s.includes(',')) {
    s = `${s.slice(0, ultimo).replace(/[.,]/g, '')}.${s.slice(ultimo + 1)}`;
  } else if (ultimo >= 0) {
    const sep = s[ultimo];
    const veces = s.split(sep).length - 1;
    const miles = veces > 1 || s.length - ultimo - 1 === 3;
    s = miles ? s.split(sep).join('') : s.replace(sep, '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Tasa del dólar en pesos enteros; null si no es un número o está fuera del rango razonable. */
export function leerTasa(texto: string): number | null {
  const n = numeroEscrito(texto);
  if (n === null) return null;
  const r = Math.round(n);
  return r >= TASA_MIN && r <= TASA_MAX ? r : null;
}

/** Pesos enteros (sin centavos), p. ej. el tope mensual; null si no es un número entero positivo. */
export function leerPesos(texto: string): number | null {
  const n = numeroEscrito(texto);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}
