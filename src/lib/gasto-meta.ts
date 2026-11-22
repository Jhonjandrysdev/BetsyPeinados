/** Gasto real que reporta Meta, llevado a pesos colombianos para que Betsy lo entienda de un vistazo. Puro. */

/** Tasa aproximada del dólar en pesos si Betsy no puso una. */
export const TASA_USD_COP_DEFECTO = 4000;

export interface GastoMeta {
  monto: number;
  /** Código ISO de la moneda en que factura la cuenta de WhatsApp (USD, COP…). */
  moneda: string;
}

export interface GastoEnPesos extends GastoMeta {
  /** Valor en pesos; null si la moneda no es USD ni COP. */
  cop: number | null;
  /** true si los pesos salen de convertir con la tasa (no es lo que cobra Meta exactamente). */
  aproximado: boolean;
}

export function gastoEnPesos({ monto, moneda }: GastoMeta, tasaUsdCop: number): GastoEnPesos {
  const m = moneda.toUpperCase();
  if (m === 'COP') return { monto, moneda: m, cop: monto, aproximado: false };
  if (m !== 'USD') return { monto, moneda: m, cop: null, aproximado: false };
  const tasa = Number.isFinite(tasaUsdCop) && tasaUsdCop > 0 ? tasaUsdCop : TASA_USD_COP_DEFECTO;
  return { monto, moneda: m, cop: Math.round(monto * tasa), aproximado: true };
}
