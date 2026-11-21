# Configuración del catálogo en Firebase

El sitio puede funcionar con el archivo `catalogo.json`. Si existe el documento
`catalogo/publicado` en Firestore, la tienda usa sus campos `products` y `exchangeRate` en su lugar. La tasa guarda cuántos bolívares equivalen a US$1.

El panel actual guarda borradores en el navegador y exporta el catálogo. Para
actualizar Firestore, usa Firebase Console con una cuenta autorizada en el
proyecto `eganaaccesorios`. En `catalogo/publicado`, carga la lista `products`
y el valor `exchangeRate` del archivo exportado. Si publicas el archivo con el
sitio y quieres usar esa versión, mantén `catalogo/publicado` sin crear.

Pega estos bloques dentro de `match /databases/{database}/documents { ... }` en la pestaña Reglas de Firestore y publica las reglas. Revisa que no
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

Si posteriormente habilitas un editor con Firebase Authentication, crea
`administradores/<UID>` desde la consola para la cuenta autorizada. Las reglas
conceden escritura desde el cliente solo a esos usuarios. El acceso de Firebase
Console se controla con los permisos del proyecto.

Para cargar fotos desde el panel, el preset `iphoneac` de la nube
`do4fpfwlb` debe admitir subidas sin firma. Restringe los formatos, el tamaño y
la carpeta en Cloudinary. Un preset sin firma permite subir imágenes a quien
conozca su nombre y el nombre de la nube. También puedes pegar la URL de una
imagen que ya esté subida.
