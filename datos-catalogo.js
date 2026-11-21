export const categories = {
  carga: 'Carga y cables',
  audio: 'Audio',
  energia: 'Energía'
};

export function isCatalogImage(image) {
  return typeof image === 'string' && image.length <= 400 && (
    /^assets\/[\w/-]+\.(?:webp|avif|jpe?g|png)$/i.test(image) ||
    /^https:\/\/res\.cloudinary\.com\/[\w/-]+(?:\.[\w]+)?(?:\?[\w=&%-]+)?$/i.test(image)
  );
}

export function validateCatalog(data) {
  const { products, exchangeRate = null } = Array.isArray(data) ? { products: data } : data ?? {};
  if (exchangeRate !== null && (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate >= 1e15)) {
    throw new Error('Ingresa una tasa positiva válida.');
  }
  if (!Array.isArray(products) || products.length > 100) {
    throw new Error('El catálogo debe contener hasta 100 productos.');
  }

  const validatedProducts = products.map((product, index) => {
    const { name, description, category, image, price = '', priceUsd = null, stock = null } = product ?? {};
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof description !== 'string' || description.length > 300 ||
        typeof category !== 'string' || !Object.hasOwn(categories, category) || !isCatalogImage(image) ||
        typeof price !== 'string' || price.length > 60 ||
        (priceUsd !== null && (!Number.isFinite(priceUsd) || priceUsd < 0 ||
          (exchangeRate !== null && !Number.isFinite(priceUsd * exchangeRate)))) ||
        (stock !== null && (!Number.isSafeInteger(stock) || stock < 0))) {
      throw new Error(`Revisa los datos del producto ${index + 1}.`);
    }
    return { name: name.trim(), description: description.trim(), category, image, price: price.trim(), priceUsd, stock };
  });
  return { exchangeRate, products: validatedProducts };
}

export async function bundledCatalog() {
  const response = await fetch(new URL('./catalogo.json', import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error('El archivo del catálogo no está disponible.');
  return validateCatalog(await response.json());
}
