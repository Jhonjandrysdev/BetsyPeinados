-- Acceso del servidor sin service_role: el servidor (Astro en Vercel) usa la anon key
-- y envía la cabecera x-server-key. Solo se guarda el hash SHA-256 de esa clave, en un
-- esquema que la API no expone. Sin la cabecera correcta, la anon key no ve ni escribe nada.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_keys (
  key_hash text primary key,
  created_at timestamptz not null default now()
);
insert into private.server_keys (key_hash)
values ('4eb4475a920e520c9d6bfa2b54163e1d4753f0189f4aaf751a0ba53adc234803')
on conflict do nothing;

create or replace function public.is_server()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.server_keys k
    where k.key_hash = encode(
      extensions.digest(coalesce(current_setting('request.headers', true)::json->>'x-server-key', ''), 'sha256'),
      'hex'
    )
  );
$$;
revoke all on function public.is_server() from public;
grant execute on function public.is_server() to anon, authenticated, service_role;

do $$
declare t text;
begin
  foreach t in array array['site_settings','services','business_hours','blocked_dates','appointments','gallery_images','google_connection','rate_limits']
  loop
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    execute format('drop policy if exists server_all on public.%I', t);
    execute format('create policy server_all on public.%I for all to anon using ((select public.is_server())) with check ((select public.is_server()))', t);
  end loop;
end $$;

-- Límite de peticiones: solo el servidor puede llamarlo.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits integer;
begin
  if not public.is_server() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return v_hits <= p_max;
end;
$$;
revoke all on function public.hit_rate_limit(text, integer, integer) from public;
grant execute on function public.hit_rate_limit(text, integer, integer) to anon, service_role;

-- Storage: el servidor puede subir y borrar fotos del bucket galeria.
drop policy if exists galeria_server_write on storage.objects;
create policy galeria_server_write on storage.objects for all to anon
  using (bucket_id = 'galeria' and (select public.is_server()))
  with check (bucket_id = 'galeria' and (select public.is_server()));
