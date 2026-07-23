-- Verificación de la instalación del backend.
-- Ejecutar en Supabase > SQL Editor después de schema.sql.

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'messages',
    'suggestions',
    'suggestion_votes',
    'photos',
    'interaction_events',
    'auction_bids'
  )
order by table_name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'messages',
    'suggestions',
    'suggestion_votes',
    'photos',
    'interaction_events',
    'auction_bids'
  )
order by tablename;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'wedding-photos';

select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('cast_vote', 'place_bid')
order by routine_name;
