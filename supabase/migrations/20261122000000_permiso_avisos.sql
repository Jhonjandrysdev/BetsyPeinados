-- Permiso de avisos automáticos por WhatsApp (2026-11-22).
-- La clienta lo da con una casilla marcada por defecto al reservar; las citas existentes quedan con permiso.
alter table public.appointments
  add column if not exists notify_opt_in boolean not null default true;
