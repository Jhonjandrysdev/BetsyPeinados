-- Flujo de abono, servicio a domicilio y largo del cabello (2026-11-18).
-- Solo aditiva: columnas nuevas con valor por defecto; no toca citas existentes
-- ni la restricción de exclusión de horarios.
alter table public.appointments
  add column if not exists home_service boolean not null default false,
  add column if not exists home_address text check (home_address is null or char_length(home_address) <= 200),
  add column if not exists hair_length text check (hair_length is null or hair_length in ('corto', 'medio', 'extra')),
  add column if not exists deposit_confirmed_at timestamptz;

-- Paquete peinado + maquillaje (valor a convenir hasta que Betsy lo defina).
insert into public.services (slug, name, description, category, duration_min, price_from, featured, sort)
values (
  'peinado-maquillaje',
  'Peinado + maquillaje',
  'Paquete completo: tu peinado con Betsy y maquillaje profesional el mismo día. Valor según el peinado y el maquillaje: te lo confirmo por WhatsApp.',
  'Paquetes', 150, null, true, 6
)
on conflict (slug) do nothing;
