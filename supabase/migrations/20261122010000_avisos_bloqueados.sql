-- Avisos bloqueados (2026-11-22): el aviso automático que no sale porque la clienta no dio permiso
-- o el WhatsApp no está conectado queda en la conversación con su razón (columna error).
alter table public.whatsapp_messages drop constraint if exists whatsapp_messages_status_check;
alter table public.whatsapp_messages add constraint whatsapp_messages_status_check
  check (status in ('enviando', 'enviado', 'entregado', 'leido', 'fallido', 'bloqueado', 'recibido', 'manual'));
