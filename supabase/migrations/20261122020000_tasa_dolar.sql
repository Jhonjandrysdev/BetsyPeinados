-- Tasa del dólar en pesos (2026-11-22): muestra en COP el gasto real de Meta cuando la cuenta factura en USD.
alter table public.site_settings
  add column if not exists wa_usd_cop integer not null default 4000 check (wa_usd_cop between 1000 and 20000);
