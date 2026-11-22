export type AppointmentStatus = 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
/** Motivo de cancelación que registra el sistema (las que cancela Betsy quedan sin motivo). */
export type CancelReason = 'sin_abono';

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
  /** Datos para el abono por transferencia (Bre-B / Nequi). */
  pay_key?: string | null;
  pay_holder?: string | null;
  pay_bank?: string | null;
  pay_qr_path?: string | null;
  /** Precio en pesos de cada mensaje que Meta cobra (para el costo en el panel). */
  wa_rate_cop?: number | null;
  /** El recordatorio "¿Confirmas tu cita?" sale solo el día anterior. */
  wa_auto_reminder?: boolean | null;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  duration_min: number;
  price_from: number | null;
  /** Precios por largo de cabello (null = el servicio no varía por largo). */
  price_short?: number | null;
  price_medium?: number | null;
  price_long?: number | null;
  /** Adicional por cada cm a partir de medio largo (solo ondas, normalmente). */
  extra_cm_price?: number | null;
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
  home_service: boolean;
  home_address: string | null;
  hair_length: string | null;
  /** Valor fijado al reservar (null = se cotiza aparte). */
  price?: number | null;
  /** Abono fijado al reservar (null = valor no exacto, Betsy lo confirma). */
  deposit?: number | null;
  /** Desplazamiento a domicilio incluido en el valor (solo informativo). */
  travel_fee?: number | null;
  deposit_confirmed_at: string | null;
  receipt_path?: string | null;
  receipt_at?: string | null;
  /** Último comprobante rechazado por Betsy: motivo y hora. */
  receipt_rejected_reason?: string | null;
  receipt_rejected_at?: string | null;
  /** Por qué se canceló: 'sin_abono' si venció el plazo del comprobante; null si la canceló Betsy. */
  cancel_reason?: CancelReason | null;
  /** La clienta acepta avisos automáticos de su cita por WhatsApp (sin la columna en la base: sí). */
  wa_opt_in?: boolean;
  /** Avisos de WhatsApp ya enviados: { abono: fecha, ... } */
  notified?: Record<string, string> | null;
  /** La clienta tocó "Confirmo" en WhatsApp. */
  client_confirmed_at?: string | null;
  /** La clienta tocó "Cambiar hora" en WhatsApp y espera otra hora. */
  change_requested_at?: string | null;
  /** Última vez que Betsy le cambió la fecha u hora. */
  rescheduled_at?: string | null;
}

export type WaStatus = 'enviando' | 'enviado' | 'entregado' | 'leido' | 'fallido' | 'recibido' | 'manual';

export interface WaMessage {
  id: number;
  appointment_id: string | null;
  phone: string;
  direction: 'out' | 'in';
  event: string | null;
  body: string;
  kind: string;
  status: WaStatus;
  error: string | null;
  wa_message_id: string | null;
  billable: boolean | null;
  category: string | null;
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
