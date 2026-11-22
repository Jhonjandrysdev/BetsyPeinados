-- Avisos bloqueados (2026-11-22): el aviso automático que no sale porque la clienta no dio permiso queda
-- en la conversación con su razón (columna error), para que Betsy lo envíe a mano.
alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_status_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_status_check
  check (status in ('enviando', 'enviado', 'entregado', 'leido', 'fallido', 'bloqueado', 'recibido', 'manual'));

-- 'comprobante_rechazado' tiene 21 letras: con el límite de 20 esos avisos salían pero no quedaban en la conversación.
alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_event_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_event_check
  check (event is null or char_length(event) <= 40);
