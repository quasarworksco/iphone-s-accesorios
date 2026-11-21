import { bundledCatalog, categories, isCatalogImage, validateCatalog } from '../datos-catalogo.js';
import { editorIdentity, readCatalog, saveCatalog, signInEditor, signOutEditor } from '../firebase-catalogo.js';

const form = document.querySelector('#editor');
const list = document.querySelector('#products');
const search = document.querySelector('#product-search');
const searchResults = document.querySelector('#search-results');
const status = document.querySelector('#status');
const publishStatus = document.querySelector('#publish-status');
const saveButton = document.querySelector('#save');
const access = document.querySelector('#access');
const login = document.querySelector('#login');
const loginStatus = document.querySelector('#login-status');
const logout = document.querySelector('#logout');
const editorNav = document.querySelector('#editor-nav');
const recover = document.querySelector('#recover');
const notice = document.querySelector('#notice');
const source = document.querySelector('#catalog-source');
const inventory = document.querySelector('#inventory');
const exchangeRate = document.querySelector('#exchange-rate');
const count = new Intl.NumberFormat('es-VE');
const money = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });
const legacyKey = 'iphone-accesorios/catalogo-borrador';
let dirty = false;
let uploads = 0;
let authorized = false;
let loadedVersion = null;
let publishing = false;

const fields = [
  { key: 'name', label: 'Nombre', max: 100, required: true },
  { key: 'category', label: 'Categoría' },
  { key: 'description', label: 'Descripción', max: 300 },
  { key: 'priceUsd', label: 'Precio en USD', step: '0.01' },
  { key: 'stock', label: 'Unidades en stock', step: '1', max: Number.MAX_SAFE_INTEGER },
  { key: 'image', label: 'Enlace de la imagen o ruta en assets', max: 400, required: true }
];

function photoControls(imageField) {
  const header = document.createElement('div');
  header.className = 'product-heading';
  const preview = document.createElement('img');
  preview.className = 'preview';
  preview.alt = '';
  preview.loading = 'lazy';
  const feedback = document.createElement('p');
  feedback.className = 'product-feedback';
  feedback.setAttribute('role', 'status');

  function refreshPreview() {
    preview.hidden = !isCatalogImage(imageField.value);
    if (!preview.hidden) preview.src = new URL(imageField.value, new URL('../', import.meta.url));
  }
  preview.addEventListener('error', () => {
    preview.hidden = true;
    feedback.textContent = 'No se pudo previsualizar la imagen. Revisa el enlace.';
  });
  imageField.addEventListener('change', () => {
    feedback.textContent = '';
    refreshPreview();
  });
  refreshPreview();

  const drop = document.createElement('label');
  drop.className = 'drop';
  drop.textContent = 'Cargar imagen';
  const hint = document.createElement('small');
  hint.textContent = 'Selecciona o arrastra una foto';
  const input = document.createElement('input');
  input.type = 'file';
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  input.accept = allowedTypes.join(',');
  drop.append(hint, input);
  header.append(preview, drop);

  async function upload(image) {
    if (!image || input.disabled) return;
    if (!allowedTypes.includes(image.type) || image.size > 10 * 1024 * 1024) {
      feedback.textContent = 'Selecciona una imagen JPG, PNG, WebP o AVIF de hasta 10 MB.';
      input.value = '';
      return;
    }
    uploads += 1;
    input.disabled = true;
    drop.setAttribute('aria-busy', 'true');
    feedback.textContent = 'Cargando imagen…';
    try {
      const body = new FormData();
      body.set('file', image);
      body.set('upload_preset', 'iphoneac');
      const response = await fetch('https://api.cloudinary.com/v1_1/do4fpfwlb/image/upload', {
        method: 'POST', body, signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error();
      const { secure_url } = await response.json();
      if (!isCatalogImage(secure_url)) throw new Error();
      imageField.value = secure_url;
      refreshPreview();
      dirty = true;
      feedback.textContent = 'Imagen cargada. El enlace ya está en el producto.';
    } catch {
      feedback.textContent = 'No se pudo cargar la imagen. Vuelve a intentarlo o pega el enlace.';
    } finally {
      uploads -= 1;
      input.value = '';
      input.disabled = false;
      drop.removeAttribute('aria-busy');
    }
  }
  input.addEventListener('change', () => upload(input.files[0]));
  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.dataset.over = '';
  });
  drop.addEventListener('dragleave', () => delete drop.dataset.over);
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    delete drop.dataset.over;
    upload(event.dataTransfer.files[0]);
  });
  return { header, feedback };
}

function addProduct(product = {}) {
  const row = document.createElement('details');
  row.className = 'product-editor';
  row.dataset.legacyPrice = product.price ?? '';
  const summary = document.createElement('summary');
  const title = document.createElement('strong');
  title.textContent = product.name || 'Nuevo producto';
  const category = document.createElement('span');
  category.textContent = categories[product.category ?? 'carga'];
  summary.append(title, category);
  const controls = document.createElement('div');
  controls.className = 'fields';
  for (const field of fields) {
    const label = document.createElement('label');
    label.textContent = field.label;
    const tag = field.key === 'category' ? 'select' : field.key === 'description' ? 'textarea' : 'input';
    const input = document.createElement(tag);
    input.name = field.key;
    if (tag === 'select') {
      for (const [value, text] of Object.entries(categories)) input.add(new Option(text, value));
    } else if (field.step) {
      input.type = 'number';
      input.min = '0';
      input.inputMode = field.key === 'stock' ? 'numeric' : 'decimal';
      input.step = field.step;
      if (field.max) input.max = field.max;
    } else {
      input.maxLength = field.max;
      input.required = Boolean(field.required);
    }
    input.value = product[field.key] ?? (tag === 'select' ? 'carga' : '');
    label.append(input);
    controls.append(label);
  }
  const { header, feedback } = photoControls(controls.querySelector('[name=image]'));
  controls.querySelector('[name=name]').addEventListener('input', (event) => {
    title.textContent = event.target.value.trim() || 'Nuevo producto';
  });
  controls.querySelector('[name=category]').addEventListener('change', (event) => {
    category.textContent = categories[event.target.value];
  });
  row.addEventListener('toggle', () => {
    if (!row.open && search.value) filterProducts();
  });
  const converted = document.createElement('p');
  converted.className = 'converted-price';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Quitar producto';
  remove.addEventListener('click', () => {
    if (row.querySelector('[aria-busy=true]')) return;
    row.remove();
    updateInventory();
    filterProducts();
    dirty = true;
    document.querySelector('#add').focus();
  });
  actions.append(remove);
  const contents = document.createElement('div');
  contents.className = 'product-fields';
  contents.append(header, controls, converted, feedback, actions);
  row.append(summary, contents);
  list.append(row);
  return row;
}

function showCatalog(catalog, label) {
  list.replaceChildren();
  exchangeRate.value = catalog.exchangeRate ?? '';
  for (const product of catalog.products) addProduct(product);
  source.textContent = label;
  form.hidden = false;
  updateInventory();
  updateConversions();
  filterProducts();
}

function searchKey(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es').trim();
}

function filterProducts() {
  const query = searchKey(search.value);
  let matches = 0;
  for (const row of list.children) {
    const name = row.querySelector('[name=name]').value;
    row.hidden = !searchKey(name).includes(query);
    if (!row.hidden) matches += 1;
  }
  searchResults.textContent = !query ? '' : matches === 0 ? 'No se encontraron productos con ese nombre.' :
    matches === 1 ? '1 producto encontrado' : `${count.format(matches)} productos encontrados`;
}

search.addEventListener('input', filterProducts);
search.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') event.preventDefault();
});

let firstInvalid;
form.addEventListener('invalid', (event) => {
  if (firstInvalid) return;
  firstInvalid = event.target;
  queueMicrotask(() => { firstInvalid = null; });
  const row = event.target.closest('.product-editor');
  if (!row) return;
  if (row.hidden) {
    search.value = '';
    filterProducts();
  }
  row.open = true;
}, true);

function updateInventory() {
  let total = 0n;
  let unknown = 0;
  let soldOut = 0;
  const stocks = [...list.querySelectorAll('[name=stock]')];
  for (const input of stocks) {
    const value = input.valueAsNumber;
    if (!input.validity.valid || !Number.isSafeInteger(value)) unknown += 1;
    else if (value === 0) soldOut += 1;
    else total += BigInt(value);
  }
  for (const [key, value] of Object.entries({ products: stocks.length, total, soldOut, unknown })) {
    inventory.querySelector(`[data-stat=${key}]`).textContent = count.format(value);
  }
  document.querySelector('#empty').hidden = stocks.length > 0;
}

function updateConversions() {
  const rate = exchangeRate.valueAsNumber;
  exchangeRate.setCustomValidity(exchangeRate.value !== '' && (rate <= 0 || rate >= 1e15) ? 'Ingresa una tasa positiva válida.' : '');
  for (const row of list.children) {
    const usd = row.querySelector('[name=priceUsd]').valueAsNumber;
    const total = usd * rate;
    row.querySelector('.converted-price').textContent = usd === 0 ? 'Bs. 0' :
      rate > 0 && usd >= 0 && Number.isFinite(total) ? `Bs. ${money.format(total)}` : '';
  }
}

function previousEdit() {
  try {
    const saved = localStorage.getItem(legacyKey);
    return saved ? validateCatalog(JSON.parse(saved)) : null;
  } catch {
    return null;
  }
}

const legacyEdit = previousEdit();
recover.hidden = !legacyEdit;
recover.addEventListener('click', () => {
  if (uploads || (dirty && !window.confirm('¿Reemplazar los cambios que tienes abiertos?'))) return;
  showCatalog(legacyEdit, 'Edición recuperada');
  dirty = true;
  recover.hidden = true;
  publishStatus.textContent = 'Revisa la edición recuperada antes de guardarla.';
});

const bundle = bundledCatalog().catch(() => null);

function updateSaveButton() {
  saveButton.disabled = publishing || !authorized || loadedVersion === null;
}

async function syncCatalog(replace = false) {
  const { data, version } = await readCatalog();
  const catalog = data === null ? await bundle : validateCatalog(data);
  if (catalog && (replace || !dirty)) {
    showCatalog(catalog, data === null ? 'Catálogo del sitio' : 'Catálogo publicado');
    dirty = false;
  }
  if (replace || !dirty) loadedVersion = version;
  updateSaveButton();
}

async function openEditor() {
  authorized = true;
  access.hidden = true;
  editorNav.hidden = false;
  logout.hidden = false;
  const catalog = await bundle;
  showCatalog(catalog ?? validateCatalog([]), catalog ? 'Catálogo del sitio' : 'Catálogo nuevo');
  try {
    await syncCatalog();
  } catch {
    publishStatus.textContent = 'Firestore no respondió. Recarga el catálogo publicado para volver a intentar.';
  }
}

function loginError(error) {
  switch (error.code) {
    case 'editor/forbidden':
      return error.message;
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'El usuario o la contraseña son incorrectos.';
    case 'auth/too-many-requests':
      return 'Hubo demasiados intentos. Espera un momento antes de volver a entrar.';
    default:
      return 'No se pudo acceder al panel. Revisa la conexión y la configuración de Firebase.';
  }
}

async function startSession() {
  if (!window.isSecureContext) {
    document.querySelector('#https-required').hidden = false;
    loginStatus.textContent = '';
    return;
  }
  const button = login.querySelector('button');
  button.disabled = true;
  login.hidden = false;
  try {
    const uid = await editorIdentity();
    loginStatus.textContent = '';
    if (uid) await openEditor();
  } catch (error) {
    loginStatus.textContent = loginError(error);
  } finally {
    button.disabled = false;
  }
}

login.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = login.querySelector('button');
  if (button.disabled || !window.isSecureContext) return;
  const password = login.elements.password;
  button.disabled = true;
  loginStatus.textContent = 'Iniciando sesión…';
  try {
    await signInEditor(login.elements.username.value, password.value);
    await openEditor();
  } catch (error) {
    loginStatus.textContent = loginError(error);
  } finally {
    password.value = '';
    button.disabled = false;
  }
});

logout.addEventListener('click', async () => {
  if (publishing || uploads || (dirty && !window.confirm('¿Cerrar sesión y descartar los cambios sin publicar?'))) return;
  logout.disabled = true;
  try {
    await signOutEditor();
    location.reload();
  } catch {
    publishStatus.textContent = 'No se pudo cerrar la sesión. Vuelve a intentarlo.';
    logout.disabled = false;
  }
});

startSession();
form.addEventListener('input', (event) => {
  if (event.target.type === 'file' || event.target === search) return;
  dirty = true;
  if (event.target.name === 'stock') updateInventory();
  if (event.target === exchangeRate || event.target.name === 'priceUsd') updateConversions();
});

document.querySelector('#add').addEventListener('click', () => {
  if (list.children.length >= 100) {
    notice.textContent = 'El catálogo admite hasta 100 productos.';
    notice.hidden = false;
    return;
  }
  search.value = '';
  const row = addProduct();
  filterProducts();
  row.open = true;
  row.classList.add('product-new');
  row.querySelector('[name=name]').focus();
  updateInventory();
  dirty = true;
});

document.querySelector('#import').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (uploads) throw new Error('Espera a que terminen de cargar las imágenes.');
    const catalog = validateCatalog(JSON.parse(await file.text()));
    if (dirty && !window.confirm('¿Reemplazar los cambios del editor con este archivo?')) return;
    showCatalog(catalog, 'Catálogo importado');
    dirty = true;
    status.textContent = 'Catálogo importado.';
  } catch (error) {
    status.textContent = `No se pudo importar el archivo. ${error.message}`;
  } finally {
    event.target.value = '';
  }
});

document.querySelector('#restore').addEventListener('click', async (event) => {
  if (uploads) {
    status.textContent = 'Espera a que terminen de cargar las imágenes.';
    return;
  }
  if (dirty && !window.confirm('¿Descartar los cambios sin publicar y cargar el catálogo público?')) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    await syncCatalog(true);
    status.textContent = 'Versión pública restaurada.';
  } catch {
    status.textContent = 'No se pudo restaurar el catálogo público.';
  } finally {
    button.disabled = false;
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const exporting = event.submitter?.id === 'export';
  const feedback = exporting ? status : publishStatus;
  if (!exporting && saveButton.disabled) return;
  try {
    if (uploads) throw new Error('Espera a que terminen de cargar las imágenes.');
    const products = [...list.children].map(row => {
      const product = { price: row.dataset.legacyPrice };
      for (const { key, step } of fields) {
        const input = row.querySelector(`[name="${key}"]`);
        product[key] = step ? (input.value === '' ? null : input.valueAsNumber) : input.value;
      }
      return product;
    });
    const catalog = validateCatalog({
      exchangeRate: exchangeRate.value === '' ? null : exchangeRate.valueAsNumber,
      products
    });
    const contents = JSON.stringify(catalog, null, 2) + '\n';
    if (!exporting) {
      publishing = true;
      updateSaveButton();
      const expected = loadedVersion;
      dirty = false;
      publishStatus.textContent = 'Guardando cambios en la tienda…';
      try {
        await saveCatalog(catalog, expected);
      } catch (error) {
        dirty = true;
        if (error.code === 'catalog-conflict') loadedVersion = null;
        if (error.code === 'permission-denied') {
          authorized = false;
          throw new Error('Firebase rechazó el cambio. Revisa los permisos de tu cuenta y las reglas.');
        }
        throw error;
      }
      if (legacyEdit && recover.hidden) {
        try { localStorage.removeItem(legacyKey); } catch { /* La publicación ya fue confirmada. */ }
      }
      source.textContent = dirty ? 'Cambios sin publicar' : 'Catálogo publicado';
      publishStatus.textContent = 'Cambios publicados en la tienda.';
      loadedVersion = null;
      try {
        const { data, version } = await readCatalog();
        if (JSON.stringify(validateCatalog(data)) === JSON.stringify(catalog)) loadedVersion = version;
      } catch { /* La escritura ya fue confirmada. */ }
      if (loadedVersion === null) publishStatus.textContent += ' Recarga el catálogo antes de volver a publicar.';
      return;
    }
    const file = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogo.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Archivo descargado. Está listo para publicar.';
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    if (!exporting) {
      publishing = false;
      updateSaveButton();
    }
  }
});
