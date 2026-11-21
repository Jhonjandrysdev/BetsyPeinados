-- Vencimiento automático de cupos sin abono (2026-11-21).

-- Por qué se canceló una cita: 'sin_abono' si venció el plazo del comprobante (null = la canceló Betsy).
alter table public.appointments
  add column if not exists cancel_reason text check (cancel_reason is null or cancel_reason in ('sin_abono'));

-- Plantilla manual nueva: cupo liberado (conserva los eventos que ya existan en la base).
alter table public.message_templates drop constraint if exists message_templates_event_check;
alter table public.message_templates add constraint message_templates_event_check
  check (event in ('apartada', 'abono', 'recordatorio', 'reagendada', 'gracias', 'cancelada', 'comprobante_rechazado', 'cupo_liberado'));

-- Tarea programada: cada 15 min llama al endpoint del sitio, solo si existen los secretos
-- (en una base local o una rama sin secretos no hace nada). Quitarla: select cron.unschedule('betsy-tick');
-- La URL y el secreto viven en Vault (no en el código):
--   select vault.create_secret('https://TU-DOMINIO', 'site_url');
--   select vault.create_secret('<mismo valor que CRON_SECRET en Vercel>', 'cron_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'betsy-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := s.url || '/api/cron/tick',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  )
  from (
    select
      (select decrypted_secret from vault.decrypted_secrets where name = 'site_url') as url,
      (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret') as secret
  ) s
  where s.url is not null and s.secret is not null;
  $$
);
