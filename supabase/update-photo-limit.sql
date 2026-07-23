-- Ejecuta este archivo una vez en Supabase > SQL Editor.
-- Permite originales de hasta 15 MB; la web los comprime antes de enviarlos.
update storage.buckets
set
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'wedding-photos';
