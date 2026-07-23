# Conectar la invitación con Supabase

Esta configuración activa mensajes, bitácora, consejos, ideas, votos, fotos,
pujas e interacciones. No utiliza Supabase Auth y no necesita registrar a los
invitados.

## 1. Crear el proyecto

1. Entra en <https://supabase.com/dashboard> y pulsa **New project**.
2. Elige la organización, un nombre como `boda-merce-oscar` y una contraseña
   segura para la base de datos.
3. Selecciona una región europea cercana.
4. Espera a que el proyecto termine de crearse.

La contraseña de base de datos es administrativa. No se copia a GitHub ni a la
web.

## 2. Crear tablas, seguridad y almacenamiento

1. En Supabase abre **SQL Editor → New query**.
2. Copia el contenido completo de `supabase/schema.sql`.
3. Pulsa **Run** una sola vez.
4. Ejecuta después `supabase/verify.sql`.

El esquema crea seis tablas, activa RLS, aplica permisos mínimos, instala las
funciones de voto y puja y crea el bucket público `wedding-photos` limitado a
JPG, PNG o WebP de hasta 15 MB. La web reduce cada fotografía a un máximo
aproximado de 3 MB y 2400 px antes de subirla.

Si el proyecto ya estaba configurado con la versión anterior, no hace falta
repetir todo el esquema: ejecuta únicamente
`supabase/update-photo-limit.sql` en el SQL Editor.

## 3. Obtener las dos credenciales públicas

En el proyecto abre **Connect** o **Settings → API Keys** y copia:

- **Project URL**, con formato `https://xxxxxxxx.supabase.co`.
- **Publishable key**, con formato `sb_publishable_...`.

La clave publicable está diseñada para páginas web y puede estar en GitHub.
Nunca copies una **Secret key**, `sb_secret_...`, ni la antigua
`service_role`.

## 4. Conectar GitHub Pages

Edita `config.js`:

```js
window.WEDDING_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseAnonKey: "sb_publishable_xxxxxxxxx",
  siteUrl: "https://jackelinelandro-beep.github.io/invitacion/"
};
```

Sube únicamente el `config.js` actualizado a la raíz del repositorio, espera a
que GitHub Pages se publique y recarga la web con `Ctrl + F5`.

Cuando está conectado, el pie de la web muestra:

`Interacciones conectadas y protegidas`

## 5. Prueba de aceptación

1. Envía una nota desde la web.
2. En **Table Editor → messages**, comprueba que aparece con
   `approved = false`.
3. Cambia `approved` a `true` y recarga la invitación: la nota debe aparecer.
4. Sube una fotografía. Debe aparecer tanto en
   **Storage → wedding-photos → public** como en la tabla `photos`.
5. Revisa la imagen y cambia `photos.approved` a `true`.
6. Realiza una puja y comprueba la fila en `auction_bids`.
7. Vota una idea y comprueba que cambia su `score`.

Elimina después los datos de prueba.

## 6. Moderación diaria

- `messages`: aprobar notas, bitácora y consejos.
- `suggestions`: aprobar ideas antes de que puedan votarse.
- `photos`: revisar el archivo y aprobar su fila.
- `auction_bids`: consultar las pujas.
- `interaction_events`: métricas técnicas sin cookies.

La interfaz administrativa es el propio panel de Supabase; no hace falta
publicar un panel de administración adicional.

## 7. Antes de compartir masivamente

Para un enlace enviado solo a invitados, RLS, validaciones, moderación y los
límites actuales son suficientes para una primera publicación. Si la dirección
se hace pública o recibe spam, el siguiente paso es colocar los envíos detrás
de una Supabase Edge Function con Cloudflare Turnstile.

El bucket de fotografías es público porque las imágenes aprobadas se muestran
directamente en el mural. Los nombres de archivo usan UUID aleatorios y las
fotos no aparecen en la web hasta aprobar su fila, pero cualquier persona que
conozca la URL exacta de un archivo podrá abrirlo.
