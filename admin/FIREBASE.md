# Publicar el catálogo desde el panel

1. En Firebase Console, abre el proyecto `eganaaccesorios`. En **Authentication → Sign-in method**, activa **Anónimo**. En **Authentication → Settings → Authorized domains**, agrega `iphoneaccesorios.dgp-link.com` si falta.
2. En **Firestore Database → Reglas**, pega y publica el [archivo completo de reglas](../firestore.rules). Si tu proyecto también usa otras colecciones, conserva las reglas de esas colecciones. Sustituye cualquier regla anterior para las dos rutas del catálogo y revisa que ninguna regla general conceda escrituras públicas.
3. Abre `/admin/`, copia el ID que aparece en **Autorizar este navegador** y crea en Firestore un documento en la colección `administradores` con ese ID exacto. Puedes añadir un campo descriptivo como `nombre` de tipo texto. El ID identifica a la sesión de ese navegador.
4. Pulsa **Verificar acceso**. Edita el catálogo o la tasa y pulsa **Guardar y publicar**. Los cambios se guardan en `catalogo/publicado`. Quita el documento de `administradores` para revocar el acceso. Si cambias de navegador o borras sus datos, autoriza el nuevo ID.

Las visitas públicas solo pueden leer el catálogo. Los documentos de administrador se crean desde la consola con una cuenta con acceso al proyecto. La tienda carga `catalogo.json` como respaldo cuando Firestore no está disponible o todavía no existe el documento. El panel conserva la importación y exportación para copias del catálogo.

El preset `iphoneac` de Cloudinary (`do4fpfwlb`) debe admitir subidas sin firma para cargar imágenes. Configura formatos, tamaño y carpeta permitidos en Cloudinary. El preset público puede ser utilizado por quien conozca su nombre y el nombre de la nube.
