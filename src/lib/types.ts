export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';

export interface SiteSettings {
  business_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  about: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  region: string;
  instagram: string;
  maps_query: string;
  home_service: boolean;
  slot_step_min: number;
  min_notice_hours: number;
  max_days_ahead: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  duration_min: number;
  price_from: number | null;
  active: boolean;
  featured: boolean;
  sort: number;
}

export interface BusinessHour {
  weekday: number; // 0 domingo … 6 sábado
  enabled: boolean;
  open_time: string; // HH:MM[:SS]
  close_time: string;
}

export interface BlockedDate {
  id: string;
  day: string; // YYYY-MM-DD
  reason: string;
}

export interface Appointment {
  id: string;
  service_id: string | null;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  source: 'web' | 'admin';
  google_event_id: string | null;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  path: string;
  alt: string;
  sort: number;
  url: string;
}

export interface GoogleConnection {
  google_email: string | null;
  refresh_token_enc: string;
  calendar_id: string;
  connected_at: string;
}
