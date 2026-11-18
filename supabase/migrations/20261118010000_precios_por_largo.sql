-- Precios por largo de cabello y adicional por cm, editables desde el panel (solo aditiva).
alter table public.services
  add column if not exists price_short integer check (price_short is null or price_short >= 0),
  add column if not exists price_medium integer check (price_medium is null or price_medium >= 0),
  add column if not exists price_long integer check (price_long is null or price_long >= 0),
  add column if not exists extra_cm_price integer check (extra_cm_price is null or extra_cm_price >= 0);
