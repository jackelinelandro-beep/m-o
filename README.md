# Prototipo final · Merce & Oscar

Versión conectada a Supabase y preparada para publicarse en GitHub Pages.

## Publicación en GitHub Pages

Sube **el contenido de esta carpeta** a la raíz del repositorio, de modo que
`index.html`, `styles.css`, `app.js` y `config.js` queden al mismo nivel.

En GitHub abre **Settings → Pages** y selecciona:

- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**

Las fotografías originales pueden pesar hasta 15 MB. La web las optimiza
automáticamente a WebP, 2400 px y un máximo aproximado de 3 MB antes de
enviarlas, para aprovechar mejor el almacenamiento disponible.

Para activar el backend, sigue [SUPABASE_SETUP.md](SUPABASE_SETUP.md). El SQL
final está en `supabase/schema.sql` y su comprobación en
`supabase/verify.sql`. Si el esquema ya estaba instalado, ejecuta solamente
`supabase/update-photo-limit.sql` para actualizar el límite del bucket.
