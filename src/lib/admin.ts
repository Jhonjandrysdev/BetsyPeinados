/** Utilidades para formularios del panel. */
export const str = (fd: FormData, k: string, max = 500) =>
  String(fd.get(k) ?? '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
export const int = (fd: FormData, k: string, min: number, max: number, def: number) => {
  const n = Number.parseInt(String(fd.get(k) ?? ''), 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
export const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
export const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'servicio';

export const back = (path: string, kind: 'ok' | 'error', msg: string) =>
  new Response(null, { status: 303, headers: { Location: `${path}?${kind}=${encodeURIComponent(msg)}` } });
