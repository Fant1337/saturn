(function () {
  'use strict';

  const state = {
    products: [],
    filtered: [],
    categories: [],
    page: 1,
    perPage: 6,
    search: '',
    category: 'all'
  };

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;

  function applyFilters() {
    const search = state.search.toLowerCase();
    state.filtered = state.products.filter((product) => {
      const matchesSearch = !search || [
        product.name,
        product.description,
        product.sku,
        product.category_name
      ].join(' ').toLowerCase().includes(search);
      const matchesCategory = state.category === 'all' || product.category_id === state.category || product.category_slug === state.category;
      return matchesSearch && matchesCategory;
    });
  }

  function renderCategoryFilters() {
    const host = ui().qs('[data-category-filters]');
    if (!host) return;
    host.innerHTML = `
      <button class="chip ${state.category === 'all' ? 'is-active' : ''}" type="button" data-category="all">Все позиции</button>
      ${state.categories.map((category) => `
        <button class="chip ${state.category === category.id ? 'is-active' : ''}" type="button" data-category="${ui().escapeHtml(category.id)}">
          ${ui().escapeHtml(category.name)}
        </button>
      `).join('')}
    `;
  }

  function renderPagination() {
    const host = ui().qs('[data-pagination]');
    if (!host) return;
    const pages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
    state.page = Math.min(state.page, pages);
    host.innerHTML = `
      <button class="icon-btn" type="button" data-page-prev ${state.page === 1 ? 'disabled' : ''} aria-label="Предыдущая страница">
        <i data-lucide="chevron-left"></i>
      </button>
      <span>${state.page} / ${pages}</span>
      <button class="icon-btn" type="button" data-page-next ${state.page === pages ? 'disabled' : ''} aria-label="Следующая страница">
        <i data-lucide="chevron-right"></i>
      </button>
    `;
  }

  function renderProducts() {
    const grid = ui().qs('[data-product-grid]');
    const count = ui().qs('[data-catalog-count]');
    if (!grid) return;

    applyFilters();
    const start = (state.page - 1) * state.perPage;
    const pageItems = state.filtered.slice(start, start + state.perPage);

    if (count) count.textContent = `${state.filtered.length} позиций`;
    grid.innerHTML = pageItems.length
      ? pageItems.map(ui().productCard).join('')
      : `
        <section class="empty-state">
          <i data-lucide="search-x"></i>
          <h2>Ничего не найдено</h2>
          <p>Измените поисковый запрос или категорию.</p>
        </section>
      `;

    renderPagination();
    ui().refreshIcons();
    window.SaturnUI.qsa('.reveal', grid).forEach((item) => item.classList.add('is-visible'));
  }

  async function initCatalogPage() {
    const page = ui().qs('[data-catalog-page]');
    if (!page) return;

    const [products, categories] = await Promise.all([db().getProducts(), db().getCategories()]);
    state.products = products;
    state.categories = categories;
    state.filtered = products;
    renderCategoryFilters();
    renderProducts();

    const search = ui().qs('[data-product-search]');
    if (search) {
      search.addEventListener('input', () => {
        state.search = search.value.trim();
        state.page = 1;
        renderProducts();
      });
    }

    ui().qs('[data-category-filters]')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category]');
      if (!button) return;
      state.category = button.dataset.category;
      state.page = 1;
      renderCategoryFilters();
      renderProducts();
    });

    ui().qs('[data-pagination]')?.addEventListener('click', (event) => {
      const pages = Math.max(1, Math.ceil(state.filtered.length / state.perPage));
      if (event.target.closest('[data-page-prev]')) state.page = Math.max(1, state.page - 1);
      if (event.target.closest('[data-page-next]')) state.page = Math.min(pages, state.page + 1);
      renderProducts();
      window.scrollTo({ top: page.offsetTop - 90, behavior: 'smooth' });
    });
  }

  function renderGallery(product) {
    const images = product.images?.length ? product.images : [product.image_url];
    return `
      <div class="gallery" data-gallery>
        <div class="gallery__main">
          <button class="icon-btn gallery__control gallery__control--prev" type="button" data-gallery-prev aria-label="Предыдущее фото">
            <i data-lucide="chevron-left"></i>
          </button>
          <img src="${ui().escapeHtml(images[0])}" alt="${ui().escapeHtml(product.name)}" data-gallery-main>
          <button class="icon-btn gallery__control gallery__control--next" type="button" data-gallery-next aria-label="Следующее фото">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>
        <div class="gallery__thumbs">
          ${images.map((image, index) => `
            <button class="${index === 0 ? 'is-active' : ''}" type="button" data-gallery-thumb="${index}">
              <img src="${ui().escapeHtml(image)}" alt="${ui().escapeHtml(product.name)} ${index + 1}">
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  function initGallery(images) {
    let active = 0;
    const main = ui().qs('[data-gallery-main]');
    const thumbs = ui().qsa('[data-gallery-thumb]');

    function setActive(index) {
      active = (index + images.length) % images.length;
      if (main) main.src = images[active];
      thumbs.forEach((thumb) => thumb.classList.toggle('is-active', Number(thumb.dataset.galleryThumb) === active));
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => setActive(Number(thumb.dataset.galleryThumb)));
    });
    ui().qs('[data-gallery-prev]')?.addEventListener('click', () => setActive(active - 1));
    ui().qs('[data-gallery-next]')?.addEventListener('click', () => setActive(active + 1));
  }

  async function initProductPage() {
    const page = ui().qs('[data-product-page]');
    if (!page) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id') || window.SaturnDB.demoProducts[0].id;
    const product = await db().getProduct(productId);

    if (!product) {
      page.innerHTML = `
        <section class="empty-state">
          <i data-lucide="package-x"></i>
          <h2>Товар не найден</h2>
          <a class="btn btn--primary" href="catalog.html"><i data-lucide="grid-3x3"></i><span>В каталог</span></a>
        </section>
      `;
      ui().refreshIcons();
      return;
    }

    const similar = await db().getSimilarProducts(product.id, product.category_id, 4);
    document.title = `${product.name} | SATURN`;
    page.innerHTML = `
      <section class="product-detail">
        ${renderGallery(product)}
        <div class="product-detail__info">
          <span class="eyebrow">${ui().escapeHtml(product.category_name || 'Спецоборудование')}</span>
          <h1>${ui().escapeHtml(product.name)}</h1>
          <p class="lead">${ui().escapeHtml(product.description)}</p>
          <div class="product-detail__price">${db().asMoney(product.price)}</div>
          <div class="product-flags">
            <span><i data-lucide="warehouse"></i>На складе: ${Number(product.stock || 0)} шт.</span>
            <span><i data-lucide="barcode"></i>Артикул: ${ui().escapeHtml(product.sku)}</span>
          </div>
          <div class="quantity-box">
            <button class="icon-btn" type="button" data-qty-minus aria-label="Уменьшить"><i data-lucide="minus"></i></button>
            <input type="number" min="1" max="${Number(product.stock || 1)}" value="1" data-quantity-input aria-label="Количество">
            <button class="icon-btn" type="button" data-qty-plus aria-label="Увеличить"><i data-lucide="plus"></i></button>
          </div>
          <div class="product-detail__actions">
            <button class="btn btn--primary btn--wide" type="button" data-add-cart="${ui().escapeHtml(product.id)}">
              <i data-lucide="shopping-cart"></i><span>Добавить в корзину</span>
            </button>
            <button class="btn btn--ghost" type="button" data-favorite="${ui().escapeHtml(product.id)}">
              <i data-lucide="heart"></i><span>В избранное</span>
            </button>
          </div>
          <div class="spec-table">
            ${ui().specRows(product.specifications)}
          </div>
        </div>
      </section>

      <section class="section section--tight">
        <div class="section-heading">
          <span>Похожие товары</span>
          <h2>Совместимые позиции</h2>
        </div>
        <div class="product-grid product-grid--compact">
          ${similar.map(ui().productCard).join('')}
        </div>
      </section>
    `;

    initGallery(product.images?.length ? product.images : [product.image_url]);
    initQuantity(Number(product.stock || 99));
    ui().refreshIcons();
  }

  function initQuantity(max) {
    const input = ui().qs('[data-quantity-input]');
    if (!input) return;
    const clamp = (value) => Math.min(max, Math.max(1, Number(value || 1)));
    ui().qs('[data-qty-minus]')?.addEventListener('click', () => {
      input.value = clamp(Number(input.value) - 1);
    });
    ui().qs('[data-qty-plus]')?.addEventListener('click', () => {
      input.value = clamp(Number(input.value) + 1);
    });
    input.addEventListener('change', () => {
      input.value = clamp(input.value);
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await initCatalogPage();
      await initProductPage();
    } catch (error) {
      ui().toast(error.message || 'Ошибка загрузки каталога', 'error');
    }
  });
})();
