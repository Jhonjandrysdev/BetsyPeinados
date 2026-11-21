-- Rechazo de comprobante (2026-11-21): motivo y hora del último rechazo, y plantilla manual nueva.
alter table public.appointments
  add column if not exists receipt_rejected_reason text check (receipt_rejected_reason is null or char_length(receipt_rejected_reason) <= 200),
  add column if not exists receipt_rejected_at timestamptz;

-- Amplía los eventos de plantillas (conserva los que ya existan en la base, como 'reagendada').
alter table public.message_templates drop constraint if exists message_templates_event_check;
alter table public.message_templates add constraint message_templates_event_check
  check (event in ('apartada', 'abono', 'recordatorio', 'reagendada', 'gracias', 'cancelada', 'comprobante_rechazado'));
