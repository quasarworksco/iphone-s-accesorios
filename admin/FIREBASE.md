# Configuración del catálogo en Firebase

El sitio puede funcionar con el archivo `catalogo.json`. Si existe el documento
`catalogo/publicado` en Firestore, la tienda usa sus campos `products` y `exchangeRate` en su lugar. La tasa guarda cuántos bolívares equivalen a US$1.

1. En el proyecto `eganaaccesorios`, habilita el proveedor Google en Firebase
   Authentication y agrega el dominio público a los dominios autorizados.
2. Inicia sesión una vez en `/admin/` y copia el UID de tu usuario desde Firebase
   Authentication. En la consola de Firestore, crea el documento
   `administradores/<UID>` para esa cuenta. Solo una cuenta con acceso a la consola
   debe administrar esa colección.
3. Pega estos bloques dentro de `match /databases/{database}/documents { ... }` en la pestaña Reglas de Firestore y publica las reglas. Revisa que no
   haya reglas más amplias que otorguen acceso a estas rutas. Conserva las reglas
   necesarias para otras colecciones.

```text
match /administradores/{uid} {
  allow get: if request.auth != null && request.auth.uid == uid;
}
match /catalogo/publicado {
  allow get: if true;
  allow create, update: if request.auth != null
    && exists(/databases/$(database)/documents/administradores/$(request.auth.uid))
    && request.resource.data.keys().hasAll(['products', 'exchangeRate', 'updatedAt'])
    && request.resource.data.keys().hasOnly(['products', 'exchangeRate', 'updatedAt'])
    && request.resource.data.products is list
    && request.resource.data.products.size() <= 100
    && (request.resource.data.exchangeRate == null
      || (request.resource.data.exchangeRate is number
        && request.resource.data.exchangeRate > 0
        && request.resource.data.exchangeRate < 1000000000000000))
    && request.resource.data.updatedAt == request.time;
}
```

4. En Cloudinary, `do4fpfwlb` es el nombre de nube y `iphoneac` es el preset
   de subida. El preset debe admitir subida sin firma para funcionar desde el
   navegador. Usa en el preset las restricciones de tipos de imagen, tamaño y
   carpeta que correspondan. El panel también admite pegar URLs de imágenes
   subidas previamente.

El botón de descarga genera `catalogo.json` para subir a la raíz del repositorio.
Cuando haya un catálogo publicado en Firestore, usa el botón de publicación del
panel para que los cambios lleguen a la tienda.
