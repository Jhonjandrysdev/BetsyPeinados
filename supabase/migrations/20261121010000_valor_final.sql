-- Valor final: desplazamiento a domicilio incluido en el valor de la cita (2026-11-21). Solo aditiva.
alter table public.appointments
  add column if not exists travel_fee integer check (travel_fee is null or travel_fee >= 0);
