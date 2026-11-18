-- Abono con QR/llave, comprobantes y mensajes a la clienta (2026-11-18). Solo aditiva.

-- Datos de pago que ve la clienta al apartar
alter table public.site_settings
  add column if not exists pay_key text check (pay_key is null or char_length(pay_key) <= 80),
  add column if not exists pay_holder text check (pay_holder is null or char_length(pay_holder) <= 80),
  add column if not exists pay_bank text check (pay_bank is null or char_length(pay_bank) <= 60),
  add column if not exists pay_qr_path text check (pay_qr_path is null or char_length(pay_qr_path) <= 200);

-- Comprobante del abono y avisos de WhatsApp ya enviados
alter table public.appointments
  add column if not exists receipt_path text check (receipt_path is null or char_length(receipt_path) <= 200),
  add column if not exists receipt_at timestamptz,
  add column if not exists notified jsonb not null default '{}'::jsonb;

-- Plantillas de mensajes editables desde el panel
create table if not exists public.message_templates (
  event text primary key check (event in ('apartada', 'abono', 'recordatorio', 'gracias', 'cancelada')),
  body text not null check (char_length(body) between 1 and 1500),
  updated_at timestamptz not null default now()
);
alter table public.message_templates enable row level security;
grant select, insert, update, delete on public.message_templates to anon;
drop policy if exists server_all on public.message_templates;
create policy server_all on public.message_templates for all to anon
  using ((select public.is_server())) with check ((select public.is_server()));

-- Bucket privado para comprobantes: solo el servidor (x-server-key) sube y lee
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;
drop policy if exists comprobantes_server on storage.objects;
create policy comprobantes_server on storage.objects for all to anon
  using (bucket_id = 'comprobantes' and (select public.is_server()))
  with check (bucket_id = 'comprobantes' and (select public.is_server()));
