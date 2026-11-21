-- WhatsApp automático (Cloud API de Meta): conversación por cita, confirmación de la
-- clienta con botones, reagendar y costo de los mensajes (2026-11-20). Solo aditiva:
-- se puede ejecutar más de una vez.

-- Cada mensaje que sale o entra por WhatsApp, enlazado a la cita cuando se puede.
create table if not exists public.whatsapp_messages (
  id bigint generated always as identity primary key,
  appointment_id uuid references public.appointments(id) on delete set null,
  phone text not null check (phone ~ '^[0-9]{7,15}$'),
  direction text not null check (direction in ('out', 'in')),
  event text check (event is null or char_length(event) <= 20),
  body text not null default '' check (char_length(body) <= 4000),
  kind text not null default 'texto' check (char_length(kind) <= 20),
  status text not null default 'enviado'
    check (status in ('enviando', 'enviado', 'entregado', 'leido', 'fallido', 'recibido', 'manual')),
  error text check (error is null or char_length(error) <= 500),
  wa_message_id text unique,
  -- Lo que Meta informa en el webhook: si el mensaje se cobra y en qué categoría.
  billable boolean,
  category text check (category is null or char_length(category) <= 30),
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_phone_idx on public.whatsapp_messages (phone, created_at);
create index if not exists whatsapp_messages_appt_idx on public.whatsapp_messages (appointment_id, created_at);
create index if not exists whatsapp_messages_created_idx on public.whatsapp_messages (created_at);

-- Solo el servidor (x-server-key) lee y escribe, como el resto de tablas.
alter table public.whatsapp_messages enable row level security;
grant select, insert, update, delete on public.whatsapp_messages to anon;
grant usage on sequence public.whatsapp_messages_id_seq to anon;
drop policy if exists server_all on public.whatsapp_messages;
create policy server_all on public.whatsapp_messages for all to anon
  using ((select public.is_server())) with check ((select public.is_server()));

-- Respuesta de la clienta a "¿Confirmas tu cita?" y reagendamientos.
alter table public.appointments
  add column if not exists client_confirmed_at timestamptz,
  add column if not exists change_requested_at timestamptz,
  add column if not exists rescheduled_at timestamptz;

-- Nuevo aviso editable: cita reagendada.
alter table public.message_templates drop constraint if exists message_templates_event_check;
alter table public.message_templates add constraint message_templates_event_check
  check (event in ('apartada', 'abono', 'recordatorio', 'reagendada', 'gracias', 'cancelada'));

-- Precio de un mensaje cobrado por Meta, en pesos (para calcular el costo en el panel),
-- y si el recordatorio de confirmación sale solo el día antes.
alter table public.site_settings
  add column if not exists wa_rate_cop numeric(10, 2) not null default 3.5 check (wa_rate_cop >= 0 and wa_rate_cop <= 10000),
  add column if not exists wa_auto_reminder boolean not null default true;
