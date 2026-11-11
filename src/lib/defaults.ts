// Datos de ejemplo (editables luego desde el panel /admin). Deben coincidir con el SQL inicial.
import type { BusinessHour, Service, SiteSettings } from './types';

export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: 'Betsy Peinados',
  tagline: 'Peinados que cuentan tu historia',
  hero_title: 'Tu cabello, tu mejor accesorio',
  hero_subtitle:
    'Peinados para grados, bodas, quinceañeras y eventos en Valledupar. Ondas, recogidos, trenzas y rizos definidos hechos a tu medida.',
  about:
    'Soy Betsy, estilista en Valledupar. Me encanta transformar cada peinado en una pieza única que resalte tu esencia. Trabajo con calma, con productos de calidad y escuchando lo que sueñas para tu día especial.',
  whatsapp: '573000000000',
  phone: '+57 300 000 0000',
  email: 'hola@betsypeinados.com',
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
  price_from: number,
  featured: boolean,
  sort: number,
): Service => ({ id, slug, name, description, category, duration_min, price_from, active: true, featured, sort });

export const DEFAULT_SERVICES: Service[] = [
  svc('00000000-0000-4000-8000-000000000001', 'ondas', 'Ondas', 'Ondas definidas y pulidas, diseñadas para dar movimiento, brillo y volumen que duran toda la noche.', 'Peinados', 60, 70000, true, 1),
  svc('00000000-0000-4000-8000-000000000002', 'quinceaneras', 'Quinceañeras', 'Peinado con detalles tiernos y elegantes para brillar en tus quince: rizos, trenzas y accesorios.', 'Eventos', 120, 150000, true, 2),
  svc('00000000-0000-4000-8000-000000000003', 'coletas', 'Coletas', 'Recogido elegante, limpio y sofisticado: coletas pulidas o con volumen para cualquier ocasión.', 'Peinados', 60, 60000, false, 3),
  svc('00000000-0000-4000-8000-000000000004', 'ninas', 'Niñas', 'Peinado infantil con detalles tiernos: trenzas, rizos y accesorios pensados para las más pequeñas.', 'Infantil', 45, 45000, false, 4),
  svc('00000000-0000-4000-8000-000000000005', 'recogidos', 'Recogidos', 'Recogido elegante, limpio y sofisticado para grados, bodas y eventos de gala.', 'Eventos', 90, 90000, true, 5),
  svc('00000000-0000-4000-8000-000000000006', 'novias', 'Novias', 'Diseñadas para realzar la forma de tu rostro y tu vestido. Incluye asesoría previa y fijación de larga duración.', 'Novias', 180, 250000, true, 6),
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
    q: '¿Con cuánta anticipación debo reservar?',
    a: 'Para grados, bodas y temporadas altas te recomiendo reservar con 1 a 2 semanas. Para peinados del día a día puedes agendar con al menos 12 horas.',
  },
  {
    q: '¿Cómo debo llegar con el cabello?',
    a: 'Limpio y completamente seco, sin aceites ni cremas pesadas. Si tienes una foto de referencia, tráela o envíala por WhatsApp.',
  },
  {
    q: '¿Atiendes a domicilio?',
    a: 'Sí, según disponibilidad y zona. Escríbeme por WhatsApp después de agendar para coordinar la dirección.',
  },
  {
    q: '¿Puedo cancelar o cambiar mi cita?',
    a: 'Claro. Avísame por WhatsApp con al menos 24 horas para liberar el espacio y reprogramar sin problema.',
  },
];
