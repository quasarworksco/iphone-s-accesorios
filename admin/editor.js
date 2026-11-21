import { bundledCatalog, categories, validateCatalog } from '../datos-catalogo.js';
import { connectAdmin, publishedCatalog } from '../firebase-catalogo.js';

const form = document.querySelector('#editor');
const list = document.querySelector('#products');
const status = document.querySelector('#status');
const connection = document.querySelector('#connection');
const publish = document.querySelector('#publish');
const signIn = document.querySelector('#sign-in');
const signOut = document.querySelector('#sign-out');
let admin;
let authorized = false;
let dirty = false;
let cloudLoaded = false;

const fields = [
  { key: 'name', label: 'Nombre', max: 100, required: true },
  { key: 'category', label: 'Categoría' },
  { key: 'description', label: 'Descripción', max: 300 },
  { key: 'price', label: 'Precio visible (opcional)', max: 60 },
  { key: 'image', label: 'Ruta en assets o URL de Cloudinary', max: 400, required: true }
];

function addProduct(product = {}) {
  const row = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = product.name || 'Nuevo producto';
  const controls = document.createElement('div');
  controls.className = 'fields';
  for (const field of fields) {
    const label = document.createElement('label');
    label.textContent = field.label;
    const tag = field.key === 'category' ? 'select' : field.key === 'description' ? 'textarea' : 'input';
    const input = document.createElement(tag);
    input.name = field.key;
    if (tag === 'select') {
      for (const [value, text] of Object.entries(categories)) {
        input.add(new Option(text, value));
      }
    } else {
      input.maxLength = field.max;
      input.required = Boolean(field.required);
    }
    input.value = product[field.key] ?? (tag === 'select' ? 'carga' : '');
    label.append(input);
    controls.append(label);
  }

  const actions = document.createElement('div');
  actions.className = 'actions';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Quitar producto';
  remove.addEventListener('click', () => {
    row.remove();
    dirty = true;
    document.querySelector('#add').focus();
  });
  const upload = document.createElement('label');
  upload.className = 'cloud-upload';
  upload.hidden = !authorized;
  upload.textContent = 'Subir foto a Cloudinary';
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/jpeg,image/png,image/webp,image/avif';
  file.addEventListener('change', async () => {
    const image = file.files[0];
    if (!image || !authorized) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(image.type) || image.size > 10 * 1024 * 1024) {
      status.textContent = 'Elige una foto JPG, PNG, WebP o AVIF de hasta 10 MB.';
      file.value = '';
      return;
    }
    file.disabled = true;
    status.textContent = 'Subiendo foto…';
    try {
      const body = new FormData();
      body.set('file', image);
      body.set('upload_preset', 'iphoneac');
      const response = await fetch('https://api.cloudinary.com/v1_1/do4fpfwlb/image/upload', { method: 'POST', body });
      if (!response.ok) throw new Error();
      const { secure_url } = await response.json();
      row.querySelector('[name=image]').value = secure_url;
      dirty = true;
      status.textContent = 'Foto subida. Publica o descarga el catálogo para guardar el cambio.';
    } catch {
      status.textContent = 'Cloudinary no aceptó la subida. Revisa el preset o pega la URL de la foto.';
    } finally {
      file.value = '';
      file.disabled = false;
    }
  });
  upload.append(file);
  actions.append(remove, upload);
  row.append(legend, controls, actions);
  list.append(row);
  return row;
}

function showCatalog(catalog) {
  list.replaceChildren();
  for (const product of catalog) addProduct(product);
  form.hidden = false;
}

const initialCatalog = bundledCatalog().then(showCatalog).catch(error => { status.textContent = error.message; });
form.addEventListener('input', () => { dirty = true; });
document.querySelector('#add').addEventListener('click', () => {
  if (list.children.length >= 100) {
    status.textContent = 'El catálogo admite hasta 100 productos.';
    return;
  }
  addProduct().querySelector('input').focus();
  dirty = true;
});

document.querySelector('#import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const catalog = validateCatalog(JSON.parse(await file.text()));
    if (dirty && !window.confirm('¿Reemplazar los cambios del editor con este archivo?')) return;
    await initialCatalog;
    showCatalog(catalog);
    dirty = true;
    status.textContent = 'Catálogo importado.';
  } catch (error) {
    status.textContent = `No se pudo importar el archivo. ${error.message}`;
  } finally {
    event.target.value = '';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const catalog = validateCatalog([...list.children].map(row =>
      Object.fromEntries(fields.map(({ key }) => [key, row.querySelector(`[name="${key}"]`).value]))));
    if (event.submitter === publish) {
      if (!authorized || !cloudLoaded) return;
      publish.disabled = true;
      status.textContent = 'Publicando catálogo…';
      await admin.publish(catalog);
      dirty = false;
      status.textContent = 'Catálogo publicado en la tienda.';
      return;
    }
    const file = new Blob([JSON.stringify(catalog, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogo.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Archivo descargado. Súbelo a la raíz del repositorio para actualizar el catálogo de GitHub.';
  } catch (error) {
    status.textContent = error.code ? `Firebase rechazó la publicación (${error.code}).` : error.message;
  } finally {
    publish.disabled = false;
  }
});

signIn.addEventListener('click', async () => {
  signIn.disabled = true;
  connection.textContent = 'Conectando con Firebase…';
  try {
    admin = await connectAdmin();
    if (!observer) observer = admin.onUser(updateUser);
    await admin.signIn();
  } catch {
    connection.textContent = 'No se pudo iniciar sesión con Google. Puedes descargar el catálogo y usar GitHub.';
  } finally {
    signIn.disabled = false;
  }
});
signOut.addEventListener('click', async () => {
  try {
    await admin.signOut();
  } catch {
    connection.textContent = 'No se pudo cerrar la sesión.';
  }
});

let observer;
let authVersion = 0;
async function updateUser(user) {
  const version = ++authVersion;
  signIn.hidden = Boolean(user);
  signOut.hidden = !user;
  authorized = false;
  cloudLoaded = false;
  publish.hidden = true;
  for (const control of list.querySelectorAll('.cloud-upload')) control.hidden = true;
  if (!user) {
    connection.textContent = 'Sesión de Google cerrada.';
    return;
  }
  try {
    if (!await admin.isAdmin(user.uid)) {
      if (version === authVersion) connection.textContent = 'Esta cuenta necesita autorización de administración en Firebase.';
      return;
    }
    await initialCatalog;
    const catalog = await publishedCatalog();
    if (version !== authVersion) return;
    if (catalog !== null && (!dirty || window.confirm('¿Reemplazar el borrador con el catálogo publicado?'))) {
      showCatalog(validateCatalog(catalog));
      dirty = false;
    }
    authorized = true;
    cloudLoaded = true;
    publish.hidden = false;
    for (const control of list.querySelectorAll('.cloud-upload')) control.hidden = false;
    connection.textContent = 'Sesión autorizada. Publica desde aquí para actualizar el catálogo de Firestore.';
  } catch {
    if (version === authVersion) connection.textContent = 'Firebase no pudo comprobar el acceso o leer el catálogo. Puedes exportar el archivo para GitHub.';
  }
}
