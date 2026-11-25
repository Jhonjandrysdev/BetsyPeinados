// Datos de ejemplo (editables luego desde el panel /admin). Deben coincidir con el SQL inicial.
import type { BusinessHour, Service, SiteSettings } from './types';

export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: 'Betsy Peinados',
  tagline: 'Especialista en ondas, peinados sociales y novias',
  hero_title: 'Tu cabello, tu mejor accesorio',
  hero_subtitle:
    'Peinados para grados, bodas, quinceañeras y eventos en Valledupar. Ondas, recogidos, trenzas y rizos definidos hechos a tu medida.',
  about:
    'Soy Betsy, estilista en Valledupar. Me encanta transformar cada peinado en una pieza única que resalte tu esencia. Trabajo con calma, con productos de calidad y escuchando lo que sueñas para tu día especial.',
  whatsapp: '573000000000',
  phone: '+57 300 000 0000',
  email: 'betsylilianabarrerapelaez@gmail.com',
  address: 'Valledupar, Cesar',
  city: 'Valledupar',
  region: 'Cesar',
  instagram: 'betsypeinados',
  maps_query: 'Valledupar, Cesar, Colombia',
  home_service: true,
  slot_step_min: 30,
  min_notice_hours: 12,
  max_days_ahead: 60,
};

const svc = (
  id: string,
  slug: string,
  name: string,
  description: string,
  category: string,
  duration_min: number,
  price_from: number | null,
  featured: boolean,
  sort: number,
  tiers?: [number, number, number],
): Service => ({
  id, slug, name, description, category, duration_min, price_from, active: true, featured, sort,
  price_short: tiers?.[0] ?? null, price_medium: tiers?.[1] ?? null, price_long: tiers?.[2] ?? null, extra_cm_price: null,
});

export const DEFAULT_SERVICES: Service[] = [
  svc('00000000-0000-4000-8000-000000000001', 'ondas', 'Ondas', 'Ondas definidas y pulidas con movimiento y brillo que duran toda la noche.', 'Peinados', 60, 70000, true, 1, [70000, 80000, 90000]),
  svc('00000000-0000-4000-8000-000000000005', 'peinados-sociales', 'Peinados sociales', 'Recogidos, semirecogidos y peinados elegantes para grados, matrimonios y eventos.', 'Eventos', 90, 80000, true, 2, [80000, 90000, 100000]),
  svc('00000000-0000-4000-8000-000000000002', 'quinceaneras', 'Quinceañeras', 'Rizos, trenzas o recogido con tu corona o tiara para brillar en tus quince.', 'Eventos', 120, 90000, true, 3, [90000, 100000, 120000]),
  svc('00000000-0000-4000-8000-000000000004', 'ninas', 'Peinados para niñas', 'Trenzas, rizos y accesorios con detalles tiernos para las más pequeñas.', 'Infantil', 45, 50000, false, 4),
  svc('00000000-0000-4000-8000-000000000006', 'novias', 'Novias', 'Diseñado para tu rostro y tu vestido, con asesoría previa y fijación de larga duración. Valor según el diseño: escríbeme para cotizar.', 'Novias', 180, null, true, 5),
  svc('00000000-0000-4000-8000-000000000007', 'peinado-maquillaje', 'Peinado + maquillaje', 'Paquete completo: tu peinado con Betsy y maquillaje profesional el mismo día. Desde $200.000 según el peinado y el maquillaje: te confirmo el valor por WhatsApp.', 'Paquetes', 150, 200000, true, 6),
];

export const DEFAULT_HOURS: BusinessHour[] = [
  { weekday: 0, enabled: true, open_time: '07:00', close_time: '13:00' },
  { weekday: 1, enabled: true, open_time: '08:00', close_time: '18:00' },
  { weekday: 2, enabled: true, open_time: '08:00', close_time: '18:00' },
  { weekday: 3, enabled: true, open_time: '08:00', close_time: '18:00' },
  { weekday: 4, enabled: true, open_time: '08:00', close_time: '18:00' },
  { weekday: 5, enabled: true, open_time: '08:00', close_time: '19:00' },
  { weekday: 6, enabled: true, open_time: '07:00', close_time: '19:00' },
];

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const FAQ = [
  {
    q: '¿Cuánto cuesta mi peinado?',
    a: 'Depende del largo de tu cabello: corto (por los hombros), medio largo (a mitad de la espalda) o largo (debajo de las caderas). Al reservar ves el precio de cada largo.',
  },
  {
    q: '¿Cómo aparto mi cita?',
    a: 'Eliges servicio, fecha y hora en la web y al final confirmas tu reserva conmigo por WhatsApp. Ahí te confirmo el valor y los datos para el abono del 50%, que es lo que asegura tu cupo.',
  },
  {
    q: '¿Me devuelven el abono si cancelo?',
    a: 'No. Una vez apartado el cupo no se realizan devoluciones de dinero. Si necesitas cambiar la fecha, escríbeme por WhatsApp con al menos 24 horas y miramos opciones.',
  },
  {
    q: '¿Cómo debo llegar con el cabello?',
    a: 'No realizamos blower, así que tu cabello debe venir limpio y completamente seco, sin aceites ni cremas pesadas. Al reservar te indico cómo prepararlo.',
  },
  {
    q: '¿Atiendes a domicilio?',
    a: 'Sí, según disponibilidad y zona. Al reservar marca "Servicio a domicilio" y escribe tu dirección; el valor del desplazamiento te lo confirmo por WhatsApp.',
  },
  {
    q: '¿Con cuánta anticipación debo reservar?',
    a: 'Para grados, bodas y temporadas altas te recomiendo reservar con 1 a 2 semanas. Para peinados del día a día puedes agendar con al menos 12 horas.',
  },
];

// ── Paquetes por evento (Roast Room, 2026-11-14) ──
// Precios reales de Betsy (lista del 2026-11-18).
export const DEPOSIT_PCT = 50;
export const DEPOSIT_RULE = `Aseguras tu cupo abonando el ${DEPOSIT_PCT}% y enviando el comprobante por WhatsApp. Sin abono no se garantiza la reserva y no hay devoluciones una vez apartado el cupo.`;
/** Políticas que se muestran al reservar y en la confirmación. */
export const POLICIES = [
  'No realizamos blower: tu cabello debe venir limpio y seco (te indicamos cómo prepararlo).',
  `Para asegurar tu cupo abonas el ${DEPOSIT_PCT}% del servicio: Betsy te confirma el valor y los datos por WhatsApp. Sin abono no se garantiza la reserva.`,
  'No se realizan devoluciones de dinero una vez apartado el cupo.',
];
export type HairLength = 'corto' | 'medio' | 'extra';
/** Largos de cabello con su referencia, para que la clienta sepa cuál es el suyo. */
export const HAIR_LENGTHS: { id: HairLength; label: string; hint: string }[] = [
  { id: 'corto', label: 'Corto', hint: 'por los hombros' },
  { id: 'medio', label: 'Medio largo', hint: 'a mitad de la espalda' },
  { id: 'extra', label: 'Largo', hint: 'debajo de las caderas' },
];
export const hairLabel = (id: string | null | undefined) => HAIR_LENGTHS.find((h) => h.id === id)?.label ?? '';
type Priced = Pick<Service, 'price_short' | 'price_medium' | 'price_long'> | null | undefined;
/** Precios por largo del servicio (editables en el panel), o null si no varía por largo. */
export const tiersOf = (sv: Priced): Record<HairLength, number> | null => {
  if (!sv || (sv.price_short == null && sv.price_medium == null && sv.price_long == null)) return null;
  const c = sv.price_short ?? sv.price_medium ?? sv.price_long ?? 0;
  const m = sv.price_medium ?? c;
  return { corto: c, medio: m, extra: sv.price_long ?? m };
};
export const priceFor = (sv: Priced, len: string | null | undefined): number | null => (len && tiersOf(sv)?.[len as HairLength]) || null;
export const depositOf = (price: number | null) => (price ? Math.round((price * DEPOSIT_PCT) / 100 / 1000) * 1000 : null);
export const ONDAS_LENGTH_NOTE = 'En ondas, a partir de medio largo cada centímetro adicional de largo tiene un costo extra.';
/** Nota del adicional por centímetro para un servicio. */
export const cmNote = (sv: Pick<Service, 'slug' | 'extra_cm_price'>, fmt: (n: number) => string) =>
  sv.extra_cm_price
    ? `A partir de medio largo, cada cm adicional de cabello suma ${fmt(sv.extra_cm_price)}.`
    : sv.slug === 'ondas'
      ? 'A partir de medio largo, cada cm adicional de cabello tiene un costo extra.'
      : '';

export interface EventPackage {
  slug: 'grados' | 'quince' | 'novias' | 'grupos' | 'maquillaje';
  name: string;
  title: string;
  pitch: string;
  /** null = se cotiza por WhatsApp. */
  price: number | null;
  /** Mostrar "Desde" antes del precio (varía por largo). */
  from?: boolean;
  /** Texto bajo el precio, p. ej. "por persona". */
  unit?: string;
  includes: string[];
  /** Servicio que se preselecciona en /reservar. */
  serviceSlug?: string;
  featured?: boolean;
}

export const PACKAGES: EventPackage[] = [
  {
    slug: 'grados',
    name: 'Grado',
    title: 'Peinado para tu grado',
    pitch: 'Lista para la ceremonia, las fotos y la fiesta, sin retoques.',
    price: 80000,
    from: true,
    includes: ['Corto $80.000 · Medio largo $90.000 · Largo $100.000', 'Asesoría previa por WhatsApp con tu foto de referencia', 'Ondas, recogido o semirecogido'],
    serviceSlug: 'peinados-sociales',
  },
  {
    slug: 'quince',
    name: 'Quinceañera',
    title: 'Peinado para tus quince',
    pitch: 'Rizos, trenzas o recogido pensado para tu vestido y tu corona.',
    price: 90000,
    from: true,
    includes: ['Corto $90.000 · Medio largo $100.000 · Largo $120.000', 'Asesoría previa con tu vestido y accesorios', 'Colocación de corona, tiara o accesorios', 'Fijación para toda la noche'],
    serviceSlug: 'quinceaneras',
    featured: true,
  },
  {
    slug: 'novias',
    name: 'Novia',
    title: 'Peinado de novia',
    pitch: 'Probamos antes para que el día de tu boda no haya sorpresas.',
    price: null,
    includes: ['Prueba de peinado antes de la boda', 'Peinado el día de tu boda', 'Domicilio incluido en Valledupar', 'Colocación de velo o tocado'],
    serviceSlug: 'novias',
  },
  {
    slug: 'grupos',
    name: 'Grupo a domicilio',
    title: 'Damas, mamá y familia',
    pitch: 'Desde 4 personas voy a tu casa y el domicilio no se cobra.',
    price: 70000,
    unit: 'por persona',
    includes: ['Desde 4 personas', 'Domicilio gratis en Valledupar', 'Ondas, coletas o recogidos para cada una'],
  },
  {
    slug: 'maquillaje',
    name: 'Peinado + maquillaje',
    title: 'Peinado y maquillaje',
    pitch: 'Llega lista de pies a cabeza: peinado con Betsy y maquillaje profesional el mismo día.',
    price: 200000,
    from: true,
    includes: ['Peinado a tu elección', 'Maquillaje profesional', 'Asesoría previa por WhatsApp'],
    serviceSlug: 'peinado-maquillaje',
  },
];

/**
 * Paquetes con los precios que Betsy tiene en el panel (Servicios): el precio del largo corto
 * (o el «desde» del servicio) y la lista de precios por largo. Sin servicio, quedan los de arriba.
 */
export function packagesFor(services: Service[]): EventPackage[] {
  const fmt = (n: number) => '$' + new Intl.NumberFormat('es-CO').format(n);
  return PACKAGES.map((p) => {
    const sv = p.serviceSlug ? services.find((x) => x.slug === p.serviceSlug) : undefined;
    if (!sv) return p;
    const t = tiersOf(sv);
    if (t) {
      const line = HAIR_LENGTHS.map((h) => `${h.label} ${fmt(t[h.id])}`).join(' · ');
      const rest = (p.includes[0] ?? '').startsWith('Corto ') ? p.includes.slice(1) : p.includes;
      return { ...p, price: t.corto, from: true, includes: [line, ...rest] };
    }
    return sv.price_from != null ? { ...p, price: sv.price_from, from: true } : p;
  });
}

/**
 * Reseñas reales de clientas (con su permiso). La sección solo aparece cuando hay al menos una.
 * Ejemplo: { name: 'Laura M.', event: 'Grado', text: '...', photo: '/resenas/laura.webp' }
 */
export const TESTIMONIALS: { name: string; event: string; text: string; photo?: string }[] = [];
