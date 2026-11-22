-- Tope mensual de gasto en WhatsApp (2026-11-22), en pesos, contra el gasto estimado del mes.
-- null = sin tope. Al 80 % se avisa en el panel; al 100 % no salen plantillas hasta el mes siguiente.
alter table public.site_settings
  add column if not exists wa_tope_cop integer check (wa_tope_cop is null or wa_tope_cop between 1 and 100000000);
