# Acceso al panel con usuario y contraseña

1. En **GitHub → Settings → Pages**, comprueba el certificado del dominio y activa **Enforce HTTPS**. Abre el panel desde `https://iphoneaccesorios.dgp-link.com/admin/`.
2. En el proyecto `eganaaccesorios`, abre **Firebase Authentication → Sign-in method** y habilita **Correo electrónico/contraseña**. El panel usa el correo como identificador interno. En el formulario se ingresa solo el usuario.
3. En **Authentication → Users → Add user**, crea la única cuenta del panel con el identificador `admin@iphoneaccesorios.dgp-link.com` y asigna la contraseña directamente en la consola. No hace falta un buzón para ese identificador. Si el administrador pierde la contraseña, gestiona el cambio desde Firebase Console o con el SDK de administración.
4. Copia el UID de esa cuenta de Authentication y crea en Firestore el documento `administradores/<UID>`. Puedes añadir un campo descriptivo como `nombre` de tipo texto.
5. En **Firestore Database → Reglas**, pega y publica el [archivo completo de reglas](../firestore.rules). Si hay otras colecciones, conserva sus reglas. Sustituye los permisos anteriores de las dos rutas del catálogo y comprueba que ninguna regla general permita escrituras públicas.
6. Abre `/admin/` e inicia sesión como `admin` con la contraseña que creaste. La cuenta funciona en cualquier navegador. Para revocar la publicación, elimina su documento de `administradores`. Las sesiones anónimas del método anterior no pueden publicar con estas reglas.

El botón **Guardar y publicar** actualiza `catalogo/publicado`. La tienda carga `catalogo.json` cuando el documento aún no existe o Firestore no está disponible.

En Cloudinary, el preset público `iphoneac` de la nube `do4fpfwlb` debe admitir subidas sin firma. Configura los formatos, el tamaño y la carpeta permitidos en el preset.
