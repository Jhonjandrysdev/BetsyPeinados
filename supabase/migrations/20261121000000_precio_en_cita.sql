-- Valor y abono fijados en la cita al reservar (2026-11-21). Solo aditiva.
-- Cambiar precios en Servicios ya no altera citas existentes.
alter table public.appointments
  add column if not exists price integer check (price is null or price >= 0),
  add column if not exists deposit integer check (deposit is null or deposit >= 0);

-- Relleno único con la misma regla que la web (tiersOf/priceFor/depositOf):
-- precio del largo si el servicio tiene tarifas; si no, el "desde" sin abono.
with t as (
  select
    a.id,
    case a.hair_length
      when 'corto' then coalesce(s.price_short, s.price_medium, s.price_long)
      when 'medio' then coalesce(s.price_medium, s.price_short, s.price_long)
      when 'extra' then coalesce(s.price_long, s.price_medium, s.price_short)
    end as tier,
    s.price_from
  from public.appointments a
  join public.services s on s.id = a.service_id
  where a.price is null
)
update public.appointments a
set
  price = coalesce(nullif(t.tier, 0), t.price_from),
  deposit = case when nullif(t.tier, 0) is not null then (round(t.tier * 50 / 100.0 / 1000.0) * 1000)::integer end
from t
where a.id = t.id;
