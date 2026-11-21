export const categories = {
  carga: 'Carga y cables',
  audio: 'Audio',
  energia: 'Energía'
};

export function validateCatalog(products) {
  if (!Array.isArray(products) || products.length > 100) {
    throw new Error('El catálogo debe contener hasta 100 productos.');
  }

  return products.map((product, index) => {
    const { name, description, category, image, price = '' } = product ?? {};
    const validImage = typeof image === 'string' && image.length <= 400 && (
      /^assets\/[\w/-]+\.(?:webp|avif|jpe?g|png)$/i.test(image) ||
      /^https:\/\/res\.cloudinary\.com\/[\w/-]+(?:\.[\w]+)?(?:\?[\w=&%-]+)?$/i.test(image)
    );
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof description !== 'string' || description.length > 300 ||
        typeof category !== 'string' || !Object.hasOwn(categories, category) || !validImage ||
        typeof price !== 'string' || price.length > 60) {
      throw new Error(`Revisa los datos del producto ${index + 1}.`);
    }
    return { name: name.trim(), description: description.trim(), category, image, price: price.trim() };
  });
}

export async function bundledCatalog() {
  const response = await fetch(new URL('./catalogo.json', import.meta.url), { cache: 'no-cache' });
  if (!response.ok) throw new Error('El archivo del catálogo no está disponible.');
  return validateCatalog(await response.json());
}
