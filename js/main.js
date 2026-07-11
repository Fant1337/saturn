(function () {
  'use strict';

  const statusLabels = ['Обрабатывается', 'Подтвержден', 'Отправлен', 'Доставлен', 'Отменен'];

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function toast(message, type = 'success') {
    let host = qs('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    const item = document.createElement('div');
    item.className = `toast toast--${type}`;
    item.innerHTML = `<i data-lucide="${type === 'error' ? 'triangle-alert' : 'check-circle-2'}"></i><span>${escapeHtml(message)}</span>`;
    host.appendChild(item);
    refreshIcons();
    requestAnimationFrame(() => item.classList.add('is-visible'));
    window.setTimeout(() => {
      item.classList.remove('is-visible');
      item.addEventListener('transitionend', () => item.remove(), { once: true });
    }, 3600);
  }

  function setBusy(element, state, label = 'Загрузка') {
    if (!element) return;
    if (state) {
      element.dataset.originalText = element.innerHTML;
      element.disabled = true;
      element.innerHTML = `<span class="spinner"></span>${label}`;
    } else {
      element.disabled = false;
      if (element.dataset.originalText) element.innerHTML = element.dataset.originalText;
      refreshIcons();
    }
  }

  function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function renderStatus(status) {
    const safeStatus = statusLabels.includes(status) ? status : statusLabels[0];
    return `<span class="status status--${safeStatus.toLowerCase().replaceAll(' ', '-')}">${escapeHtml(safeStatus)}</span>`;
  }

  function specRows(specifications) {
    const specs = window.SaturnDB?.parseSpecs(specifications) || {};
    return Object.entries(specs)
      .map(([name, value]) => `
        <div class="spec-row">
          <span>${escapeHtml(name)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `)
      .join('');
  }

  function productCard(product) {
    const price = window.SaturnDB.asMoney(product.price);
    return `
      <article class="product-card reveal" data-product-card="${escapeHtml(product.id)}">
        <a class="product-card__media" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="Открыть товар">
          <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy">
          <span class="product-card__category">${escapeHtml(product.category_name || 'Каталог')}</span>
        </a>
        <div class="product-card__body">
          <div class="product-card__head">
            <h3>${escapeHtml(product.name)}</h3>
            <button class="icon-btn icon-btn--small" type="button" data-favorite="${escapeHtml(product.id)}" aria-label="Добавить в избранное">
              <i data-lucide="heart"></i>
            </button>
          </div>
          <p>${escapeHtml(product.description)}</p>
          <div class="product-card__meta">
            <span class="price">${price}</span>
            <span class="stock"><i data-lucide="boxes"></i>${Number(product.stock || 0)} шт.</span>
          </div>
          <div class="product-card__actions">
            <a class="btn btn--ghost" href="product.html?id=${encodeURIComponent(product.id)}">
              <i data-lucide="scan-search"></i><span>Подробнее</span>
            </a>
            <button class="btn btn--primary" type="button" data-add-cart="${escapeHtml(product.id)}">
              <i data-lucide="shopping-cart"></i><span>В корзину</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function orderItemsList(order) {
    return (order.order_items || [])
      .map((item) => {
        const productName = item.products?.name || 'Товар';
        const sku = item.products?.sku ? ` / ${item.products.sku}` : '';
        return `<li>${escapeHtml(productName)}${escapeHtml(sku)} × ${Number(item.quantity || 0)}</li>`;
      })
      .join('');
  }

  async function updateCartBadge() {
    const badges = qsa('[data-cart-count]');
    if (!badges.length || !window.SaturnDB) return;
    const count = await window.SaturnDB.getCartCount().catch(() => 0);
    badges.forEach((badge) => {
      badge.textContent = count;
      badge.hidden = count === 0;
    });
  }

  async function updateNavAuth() {
    if (!window.SaturnDB) return;
    const user = await window.SaturnDB.currentUser().catch(() => null);
    const admin = user ? await window.SaturnDB.isAdmin().catch(() => false) : false;

    qsa('[data-auth-link]').forEach((link) => {
      const label = qs('[data-auth-label]', link);
      if (user) {
        link.href = 'profile.html';
        if (label) label.textContent = 'Кабинет';
      } else {
        link.href = 'login.html';
        if (label) label.textContent = 'Войти';
      }
    });

  }

  function initNavigation() {
    const toggle = qs('[data-nav-toggle]');
    const menu = qs('[data-nav-menu]');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        menu.classList.toggle('is-open');
      });
    }

    const page = document.body.dataset.page;
    qsa('.nav-link').forEach((link) => {
      const target = link.getAttribute('href') || '';
      if (page && target.includes(`${page}.html`)) link.classList.add('is-active');
      if (page === 'home' && target === 'index.html') link.classList.add('is-active');
    });
  }

  function initReveal() {
    const items = qsa('.reveal');
    if (!items.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
  }

  function initConfigPanel() {
    const form = qs('[data-config-form]');
    if (!form) return;
    const current = window.SaturnDB.getConfig();
    if (current) {
      form.elements.url.value = current.url || '';
      form.elements.anonKey.value = current.anonKey || '';
    }
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      window.SaturnDB.setConfig(form.elements.url.value, form.elements.anonKey.value);
      toast('Конфигурация Supabase сохранена. Обновите страницу для новой сессии.');
    });
  }

  function initAddToCart() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-add-cart]');
      if (!button) return;
      event.preventDefault();
      const productId = button.dataset.addCart;
      const quantityInput = qs('[data-quantity-input]');
      const quantity = quantityInput ? Number(quantityInput.value || 1) : 1;
      try {
        setBusy(button, true, 'Добавляем');
        await window.SaturnDB.addToCart(productId, quantity);
        toast('Товар добавлен в корзину');
        await updateCartBadge();
      } catch (error) {
        toast(error.message || 'Не удалось добавить товар', 'error');
      } finally {
        setBusy(button, false);
      }
    });
  }

  function initFavorites() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-favorite]');
      if (!button) return;
      event.preventDefault();
      try {
        const active = await window.SaturnDB.toggleFavorite(button.dataset.favorite);
        button.classList.toggle('is-active', active);
        toast(active ? 'Товар добавлен в избранное' : 'Товар удален из избранного');
      } catch (error) {
        toast(error.message || 'Не удалось изменить избранное', 'error');
      }
    });
  }

  function initLogout() {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-logout]');
      if (!button) return;
      event.preventDefault();
      await window.SaturnDB.logout();
      toast('Вы вышли из аккаунта');
      window.location.href = 'index.html';
    });
  }

  function initHeaderState() {
    const header = qs('.site-header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 20);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    initReveal();
    initAddToCart();
    initFavorites();
    initLogout();
    initConfigPanel();
    initHeaderState();
    refreshIcons();
    await updateNavAuth();
    await updateCartBadge();
  });

  window.addEventListener('saturn:cart-changed', updateCartBadge);
  window.addEventListener('saturn:auth-changed', updateNavAuth);
  window.addEventListener('saturn:toast', (event) => toast(event.detail.message, event.detail.type));

  window.SaturnUI = {
    qs,
    qsa,
    escapeHtml,
    formatDate,
    toast,
    setBusy,
    refreshIcons,
    renderStatus,
    specRows,
    productCard,
    orderItemsList,
    updateCartBadge,
    updateNavAuth,
    statusLabels
  };
})();
