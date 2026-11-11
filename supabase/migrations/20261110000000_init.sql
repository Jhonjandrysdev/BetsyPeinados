-- Betsy Peinados · esquema inicial
-- Todo el acceso a datos se hace desde el servidor (Astro) con la service_role key.
-- RLS está activado en todas las tablas y NO hay políticas para anon/authenticated,
-- así que la anon key pública no puede leer ni escribir nada.

create extension if not exists btree_gist;

-- ───────────────────────── Ajustes del negocio (una sola fila) ─────────────────────────
create table if not exists public.site_settings (
  id              smallint primary key default 1 check (id = 1),
  business_name   text not null default 'Betsy Peinados',
  tagline         text not null default 'Peinados que cuentan tu historia',
  hero_title      text not null default 'Tu cabello, tu mejor accesorio',
  hero_subtitle   text not null default 'Peinados para grados, bodas, quinceañeras y eventos en Valledupar. Ondas, recogidos, trenzas y rizos definidos hechos a tu medida.',
  about           text not null default 'Soy Betsy, estilista en Valledupar. Me encanta transformar cada peinado en una pieza única que resalte tu esencia. Trabajo con calma, con productos de calidad y escuchando lo que sueñas para tu día especial.',
  whatsapp        text not null default '573000000000',
  phone           text not null default '+57 300 000 0000',
  email           text not null default 'hola@betsypeinados.com',
  address         text not null default 'Valledupar, Cesar',
  city            text not null default 'Valledupar',
  region          text not null default 'Cesar',
  instagram       text not null default 'betsypeinados',
  maps_query      text not null default 'Valledupar, Cesar, Colombia',
  home_service    boolean not null default true,
  slot_step_min   smallint not null default 30 check (slot_step_min between 10 and 120),
  min_notice_hours smallint not null default 12 check (min_notice_hours between 0 and 168),
  max_days_ahead  smallint not null default 60 check (max_days_ahead between 1 and 365),
  updated_at      timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

-- ───────────────────────── Servicios ─────────────────────────
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name          text not null check (char_length(name) between 2 and 80),
  description   text not null default '' check (char_length(description) <= 500),
  category      text not null default 'Peinados' check (char_length(category) <= 40),
  duration_min  smallint not null check (duration_min between 15 and 480),
  price_from    integer check (price_from is null or price_from >= 0),
  active        boolean not null default true,
  featured      boolean not null default false,
  sort          smallint not null default 0,
  created_at    timestamptz not null default now()
);

insert into public.services (slug, name, description, category, duration_min, price_from, featured, sort) values
  ('ondas', 'Ondas', 'Ondas definidas y pulidas, diseñadas para dar movimiento, brillo y volumen que duran toda la noche.', 'Peinados', 60, 70000, true, 1),
  ('quinceaneras', 'Quinceañeras', 'Peinado con detalles tiernos y elegantes para brillar en tus quince: rizos, trenzas y accesorios.', 'Eventos', 120, 150000, true, 2),
  ('coletas', 'Coletas', 'Recogido elegante, limpio y sofisticado: coletas pulidas o con volumen para cualquier ocasión.', 'Peinados', 60, 60000, false, 3),
  ('ninas', 'Niñas', 'Peinado infantil con detalles tiernos: trenzas, rizos y accesorios pensados para las más pequeñas.', 'Infantil', 45, 45000, false, 4),
  ('recogidos', 'Recogidos', 'Recogido elegante, limpio y sofisticado para grados, bodas y eventos de gala.', 'Eventos', 90, 90000, true, 5),
  ('novias', 'Novias', 'Diseñadas para realzar la forma de tu rostro y tu vestido. Incluye asesoría previa y fijación de larga duración.', 'Novias', 180, 250000, true, 6)
on conflict (slug) do nothing;

-- ───────────────────────── Horario semanal (0 = domingo … 6 = sábado) ─────────────────────────
create table if not exists public.business_hours (
  weekday     smallint primary key check (weekday between 0 and 6),
  enabled     boolean not null default true,
  open_time   time not null default '08:00',
  close_time  time not null default '18:00',
  check (close_time > open_time)
);
insert into public.business_hours (weekday, enabled, open_time, close_time) values
  (0, true,  '07:00', '13:00'),
  (1, true,  '08:00', '18:00'),
  (2, true,  '08:00', '18:00'),
  (3, true,  '08:00', '18:00'),
  (4, true,  '08:00', '18:00'),
  (5, true,  '08:00', '19:00'),
  (6, true,  '07:00', '19:00')
on conflict (weekday) do nothing;

-- ───────────────────────── Días bloqueados ─────────────────────────
create table if not exists public.blocked_dates (
  id      uuid primary key default gen_random_uuid(),
  day     date not null unique,
  reason  text not null default '' check (char_length(reason) <= 120)
);

-- ───────────────────────── Citas ─────────────────────────
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  service_id      uuid references public.services(id) on delete set null,
  service_name    text not null,
  customer_name   text not null check (char_length(customer_name) between 2 and 80),
  customer_phone  text not null check (customer_phone ~ '^\+?[0-9]{7,15}$'),
  customer_email  text check (customer_email is null or char_length(customer_email) <= 120),
  notes           text not null default '' check (char_length(notes) <= 500),
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          text not null default 'confirmada'
                  check (status in ('pendiente', 'confirmada', 'cancelada', 'completada')),
  source          text not null default 'web' check (source in ('web', 'admin')),
  google_event_id text,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Evita dos citas activas que se crucen, incluso con peticiones simultáneas.
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendiente', 'confirmada'))
);
create index if not exists appointments_starts_at_idx on public.appointments (starts_at);

-- ───────────────────────── Galería ─────────────────────────
create table if not exists public.gallery_images (
  id          uuid primary key default gen_random_uuid(),
  path        text not null unique,
  alt         text not null default 'Peinado realizado por Betsy Peinados' check (char_length(alt) <= 160),
  sort        smallint not null default 0,
  created_at  timestamptz not null default now()
);

-- ───────────────────────── Conexión con Google Calendar ─────────────────────────
create table if not exists public.google_connection (
  id                 smallint primary key default 1 check (id = 1),
  google_email       text,
  refresh_token_enc  text not null,   -- cifrado AES-256-GCM en el servidor
  calendar_id        text not null default 'primary',
  connected_at       timestamptz not null default now()
);

-- ───────────────────────── Límite de peticiones (anti-spam) ─────────────────────────
create table if not exists public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  hits          integer not null default 0
);

create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  -- limpieza ocasional
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;

-- ───────────────────────── RLS: todo cerrado para clientes ─────────────────────────
alter table public.site_settings     enable row level security;
alter table public.services          enable row level security;
alter table public.business_hours    enable row level security;
alter table public.blocked_dates     enable row level security;
alter table public.appointments      enable row level security;
alter table public.gallery_images    enable row level security;
alter table public.google_connection enable row level security;
alter table public.rate_limits       enable row level security;

revoke all on all tables in schema public from anon, authenticated;

-- ───────────────────────── Storage: bucket público para la galería ─────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galeria', 'galeria', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
