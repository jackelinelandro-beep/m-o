-- Backend de la invitación Merce & Oscar
-- Ejecutar completo en Supabase > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 500),
  author text not null default 'Anónimo' check (char_length(author) between 1 and 80),
  category text not null default 'note' check (category in ('note','log','advice')),
  subtype text check (subtype is null or subtype in ('travel','place','experience')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 180),
  author text not null default 'Anónimo' check (char_length(author) between 1 and 80),
  score integer not null default 0,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  voter_id uuid not null,
  direction smallint not null check (direction in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (suggestion_id, voter_id)
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique check (storage_path like 'public/%'),
  public_url text not null check (char_length(public_url) <= 1000),
  caption text check (caption is null or char_length(caption) <= 180),
  author text not null default 'Anónimo' check (char_length(author) between 1 and 80),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.interaction_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in (
    'comic_completed','directions_opened','calendar_downloaded',
    'message_submitted','suggestion_submitted','suggestion_voted','photo_uploaded',
    'story_unlocked','log_submitted','advice_submitted','bid_placed','cat_secret_unlocked'
  )),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) <= 2048),
  created_at timestamptz not null default now()
);

-- Compatibilidad al volver a ejecutar este archivo sobre la primera versión.
alter table public.messages add column if not exists category text not null default 'note';
alter table public.messages add column if not exists subtype text;
alter table public.messages drop constraint if exists messages_category_check;
alter table public.messages add constraint messages_category_check check (category in ('note','log','advice'));
alter table public.messages drop constraint if exists messages_subtype_check;
alter table public.messages add constraint messages_subtype_check check (subtype is null or subtype in ('travel','place','experience'));

alter table public.interaction_events drop constraint if exists interaction_events_event_type_check;
alter table public.interaction_events add constraint interaction_events_event_type_check check (event_type in (
  'comic_completed','directions_opened','calendar_downloaded',
  'message_submitted','suggestion_submitted','suggestion_voted','photo_uploaded',
  'story_unlocked','log_submitted','advice_submitted','bid_placed','cat_secret_unlocked'
));

create table if not exists public.auction_bids (
  id uuid primary key default gen_random_uuid(),
  lot_id text not null check (lot_id in ('bride-league','groom-boxers')),
  bidder text not null check (char_length(bidder) between 1 and 60),
  amount numeric(10,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.photos enable row level security;
alter table public.interaction_events enable row level security;
alter table public.auction_bids enable row level security;

-- Permisos mínimos para la API pública. Las políticas RLS de abajo deciden
-- qué filas concretas puede leer o insertar cada visitante.
grant usage on schema public to anon, authenticated;

revoke all on table public.messages from anon, authenticated;
revoke all on table public.suggestions from anon, authenticated;
revoke all on table public.suggestion_votes from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
revoke all on table public.interaction_events from anon, authenticated;
revoke all on table public.auction_bids from anon, authenticated;

grant select, insert on table public.messages to anon, authenticated;
grant select, insert on table public.suggestions to anon, authenticated;
grant select, insert on table public.photos to anon, authenticated;
grant insert on table public.interaction_events to anon, authenticated;
grant select on table public.auction_bids to anon, authenticated;

-- La columna identity de interaction_events usa esta secuencia.
grant usage, select on sequence public.interaction_events_id_seq to anon, authenticated;

-- Mensajes, propuestas y fotos: solo se muestran cuando un administrador los aprueba.
drop policy if exists "guest can submit message" on public.messages;
create policy "guest can submit message" on public.messages for insert to anon, authenticated with check (approved = false);
drop policy if exists "public can read approved messages" on public.messages;
create policy "public can read approved messages" on public.messages for select to anon, authenticated using (approved = true);

drop policy if exists "guest can submit suggestion" on public.suggestions;
create policy "guest can submit suggestion" on public.suggestions for insert to anon, authenticated with check (approved = false and score = 0);
drop policy if exists "public can read approved suggestions" on public.suggestions;
create policy "public can read approved suggestions" on public.suggestions for select to anon, authenticated using (approved = true);

drop policy if exists "guest can submit photo metadata" on public.photos;
create policy "guest can submit photo metadata" on public.photos for insert to anon, authenticated with check (approved = false);
drop policy if exists "public can read approved photos" on public.photos;
create policy "public can read approved photos" on public.photos for select to anon, authenticated using (approved = true);

drop policy if exists "guest can record interaction" on public.interaction_events;
create policy "guest can record interaction" on public.interaction_events for insert to anon, authenticated with check (true);

drop policy if exists "public can read auction bids" on public.auction_bids;
create policy "public can read auction bids" on public.auction_bids for select to anon, authenticated using (true);

-- Índices para las lecturas públicas y la clasificación de la subasta.
create index if not exists messages_approved_created_idx
  on public.messages (approved, created_at desc);
create index if not exists suggestions_approved_score_idx
  on public.suggestions (approved, score desc);
create index if not exists photos_approved_created_idx
  on public.photos (approved, created_at desc);
create index if not exists auction_bids_lot_amount_idx
  on public.auction_bids (lot_id, amount desc);

-- Voto atómico: un dispositivo puede mantener un voto (+1 o -1) por propuesta.
create or replace function public.cast_vote(
  p_suggestion_id uuid,
  p_voter_id uuid,
  p_direction smallint
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_score integer;
begin
  if p_direction not in (-1, 1) then
    raise exception 'Dirección de voto no válida';
  end if;
  if not exists (select 1 from public.suggestions where id = p_suggestion_id and approved = true) then
    raise exception 'Propuesta no disponible';
  end if;

  insert into public.suggestion_votes (suggestion_id, voter_id, direction)
  values (p_suggestion_id, p_voter_id, p_direction)
  on conflict (suggestion_id, voter_id)
  do update set direction = excluded.direction, updated_at = now();

  select coalesce(sum(direction), 0)::integer into new_score
  from public.suggestion_votes where suggestion_id = p_suggestion_id;

  update public.suggestions set score = new_score where id = p_suggestion_id;
  return new_score;
end;
$$;

revoke all on function public.cast_vote(uuid, uuid, smallint) from public;
grant execute on function public.cast_vote(uuid, uuid, smallint) to anon, authenticated;

-- Puja atómica: bloquea el lote durante la operación para impedir empates o carreras.
create or replace function public.place_bid(
  p_lot_id text,
  p_bidder text,
  p_amount numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_amount numeric;
begin
  if p_lot_id not in ('bride-league','groom-boxers') then raise exception 'Lote no válido'; end if;
  if char_length(trim(p_bidder)) not between 1 and 60 then raise exception 'Alias no válido'; end if;
  perform pg_advisory_xact_lock(hashtext(p_lot_id));
  select coalesce(max(amount),0) into current_amount from public.auction_bids where lot_id = p_lot_id;
  if p_amount <= current_amount then raise exception 'La puja debe superar %', current_amount; end if;
  insert into public.auction_bids (lot_id,bidder,amount) values (p_lot_id,trim(p_bidder),p_amount);
  return jsonb_build_object('lot_id',p_lot_id,'bidder',trim(p_bidder),'amount',p_amount);
end;
$$;

revoke all on function public.place_bid(text, text, numeric) from public;
grant execute on function public.place_bid(text, text, numeric) to anon, authenticated;

-- Almacenamiento público con escritura limitada a imágenes de hasta 15 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wedding-photos', 'wedding-photos', true, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view wedding photos" on storage.objects;
create policy "public can view wedding photos" on storage.objects for select to anon, authenticated
using (bucket_id = 'wedding-photos');

drop policy if exists "guest can upload wedding photo" on storage.objects;
create policy "guest can upload wedding photo" on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'wedding-photos'
  and (storage.foldername(name))[1] = 'public'
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp'])
);

-- Contenido inicial visible. El bloque no duplica filas si se ejecuta varias veces.
insert into public.suggestions (body, author, score, approved)
select seed.body, seed.author, seed.score, true
from (values
  ('Que suene una canción de rock elegida por los novios.', 'La tribuna', 8),
  ('Foto de equipo completo con Doce por videollamada.', 'Club del gato', 5),
  ('Cinco minutos más de fiesta antes de cada despedida.', 'Béjar unlocked', 11)
) as seed(body, author, score)
where not exists (select 1 from public.suggestions);

insert into public.messages (body, author, category, subtype, approved)
select seed.body, seed.author, seed.category, seed.subtype, true
from (values
  ('Que la aventura siga siempre sin mapa, pero en el mismo equipo.', 'El equipo de Béjar', 'note', null),
  ('Por muchas noches de pantalla, cinco minutos más y planes improvisados.', 'Doce (supervisado)', 'note', null),
  ('Lisboa en octubre. Sin agenda, con el Tajo de fondo y tiempo para perderse.', 'Alguien que volvería', 'log', 'place'),
  ('Construid una vida que os guste también los martes.', 'Quien ya aprendió', 'advice', null)
) as seed(body, author, category, subtype)
where not exists (select 1 from public.messages);

-- RLS protege la lectura privada y la aprobación, pero un endpoint público de
-- escritura nunca es inmune al spam. Para una difusión masiva, coloca los envíos
-- detrás de una Edge Function con Turnstile y retira las políticas públicas de insert.
