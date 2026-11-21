import { bundledCatalog, validateCatalog } from './datos-catalogo.js';
import { publishedCatalog } from './firebase-catalogo.js';

const filters = document.querySelector('.filters');
const grid = document.querySelector('.products');
const message = document.querySelector('#catalog-message');
const filterStatus = document.querySelector('#filter-status');
let products = [];
let exchangeRate = null;
const rateLabel = document.querySelector('#catalog-rate');
const amount = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });
const units = new Intl.NumberFormat('es-VE');
const rateFormat = new Intl.NumberFormat('es-VE', { maximumSignificantDigits: 15 });

function render() {
  const category = filters.querySelector('[aria-pressed="true"]').dataset.filter;
  const visible = products.filter(product => category === 'all' || product.category === category);
  grid.replaceChildren(...visible.map(product => {
    const card = document.createElement('article');
    card.className = 'product';
    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.loading = 'lazy';
    image.width = 480;
    image.height = 360;

    const body = document.createElement('div');
    body.className = 'product-body';
    const title = document.createElement('h3');
    title.textContent = product.name;
    const description = document.createElement('p');
    description.textContent = product.description;
    body.append(title, description);

    const prices = [];
    if (product.priceUsd !== null) prices.push(`US$${amount.format(product.priceUsd)}`);
    if (product.priceUsd === 0 || (product.priceUsd !== null && exchangeRate !== null)) {
      prices.push(`Bs. ${amount.format(product.priceUsd * (exchangeRate ?? 0))}`);
    }
    const price = document.createElement('strong');
    price.textContent = prices.join(' / ') || product.price || 'Consultar precio';
    body.append(price);

    const availability = document.createElement('p');
    availability.textContent = product.stock === null ? 'Consultar disponibilidad' :
      product.stock === 0 ? 'Agotado' :
      product.stock === 1 ? '1 unidad disponible' : `${units.format(product.stock)} unidades disponibles`;
    body.append(availability);

    const link = document.createElement('a');
    link.textContent = 'Consultar por WhatsApp';
    link.setAttribute('aria-label', `Consultar ${product.name} por WhatsApp`);
    link.href = 'https://wa.me/584123897248?text=' +
      encodeURIComponent(`Hola, quisiera consultar precio y disponibilidad de ${product.name}.`);
    body.append(link);
    card.append(image, body);
    return card;
  }));
  rateLabel.textContent = exchangeRate === null ? '' : `Tasa de referencia: Bs. ${rateFormat.format(exchangeRate)} por US$1.`;
  message.textContent = visible.length ? '' : 'Aún no hay productos en esta categoría.';
  filterStatus.textContent = `${visible.length} ${visible.length === 1 ? 'producto' : 'productos'}`;
}

filters.addEventListener('click', (event) => {
  const selected = event.target.closest('button[data-filter]');
  if (!selected) return;
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === selected));
  }
  render();
  if (matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    grid.getAnimations().forEach(animation => animation.cancel());
    grid.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
  }
});

message.textContent = 'Cargando catálogo…';
const localCatalog = bundledCatalog().then((catalog) => {
  ({ products, exchangeRate } = catalog);
  filters.hidden = false;
  render();
}).catch(() => {
  message.textContent = 'Consulta el catálogo por WhatsApp en la sección de contacto.';
});

publishedCatalog().then(async (catalog) => {
  if (catalog === null) return;
  const published = validateCatalog(catalog);
  await localCatalog;
  ({ products, exchangeRate } = published);
  filters.hidden = false;
  render();
}).catch(() => {
  // El archivo publicado con GitHub mantiene el catálogo disponible.
});

document.querySelector('#year').textContent = new Date().getFullYear();
