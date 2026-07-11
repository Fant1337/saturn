(function () {
  'use strict';

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;

  let adminProducts = [];
  let adminCategories = [];

  async function guardAdmin() {
    const root = ui().qs('[data-admin-page]');
    if (!root) return false;
    const badge = document.getElementById('demo-badge');
    if (!db().isReady()) {
      if (badge) badge.style.display = 'inline-flex';
      return true;
    }
    const admin = await db().isAdmin().catch(() => false);
    if (!admin) {
      root.innerHTML = `
        <section class="empty-state">
          <i data-lucide="lock-keyhole"></i>
          <h2>Доступ закрыт</h2>
          <p>Панель доступна только пользователям с ролью Admin.</p>
          <a class="btn btn--primary" href="profile.html"><i data-lucide="user-round"></i><span>В кабинет</span></a>
        </section>
      `;
      ui().refreshIcons();
      return false;
    }
    return true;
  }

  function initTabs() {
    ui().qsa('[data-admin-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.adminTab;
        ui().qsa('[data-admin-tab]').forEach((item) => item.classList.toggle('is-active', item === tab));
        ui().qsa('[data-admin-panel]').forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.adminPanel === target);
        });
      });
    });
  }

  async function renderStats() {
    const host = ui().qs('[data-admin-stats]');
    if (!host) return;
    const stats = await db().getStats();
    host.innerHTML = `
      <div class="metric"><span>Товаров</span><strong>${stats.products}</strong></div>
      <div class="metric"><span>Пользователей</span><strong>${stats.users}</strong></div>
      <div class="metric"><span>Заказов</span><strong>${stats.orders}</strong></div>
      <div class="metric"><span>Оборот</span><strong>${db().asMoney(stats.revenue)}</strong></div>
    `;
  }

  async function renderOrders() {
    const host = ui().qs('[data-admin-orders]');
    if (!host) return;
    const orders = await db().getAllOrders();
    host.innerHTML = orders.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Клиент</th>
              <th>Телефон</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map((order) => `
              <tr>
                <td>
                  <strong>№ ${ui().escapeHtml(order.id.slice(0, 8).toUpperCase())}</strong>
                  <small>${(order.order_items || []).length} поз.</small>
                </td>
                <td>${ui().escapeHtml(order.full_name || order.users?.full_name || '-')}</td>
                <td>${ui().escapeHtml(order.phone || order.users?.phone || '-')}</td>
                <td>${db().asMoney(order.total_price)}</td>
                <td>
                  <select data-order-status="${ui().escapeHtml(order.id)}">
                    ${ui().statusLabels.map((status) => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`).join('')}
                  </select>
                </td>
                <td>${ui().formatDate(order.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="empty-state empty-state--small"><i data-lucide="package-x"></i><p>Заказов пока нет.</p></div>';
    ui().refreshIcons();
  }

  async function renderUsers() {
    const host = ui().qs('[data-admin-users]');
    if (!host) return;
    const users = await db().getUsers();
    host.innerHTML = users.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Телефон</th>
              <th>Роль</th>
              <th>Дата</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((user) => `
              <tr>
                <td><strong>${ui().escapeHtml(user.full_name || 'Без имени')}</strong><small>${ui().escapeHtml(user.id)}</small></td>
                <td>${ui().escapeHtml(user.phone || '-')}</td>
                <td><span class="role-badge">${user.role === 'admin' ? 'Admin' : 'User'}</span></td>
                <td>${ui().formatDate(user.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="empty-state empty-state--small"><i data-lucide="users"></i><p>Пользователей пока нет.</p></div>';
    ui().refreshIcons();
  }

  async function renderProductFormOptions() {
    const select = ui().qs('[data-product-category]');
    if (!select) return;
    select.innerHTML = adminCategories.map((category) => `
      <option value="${ui().escapeHtml(category.id)}">${ui().escapeHtml(category.name)}</option>
    `).join('');
  }

  function renderProducts() {
    const host = ui().qs('[data-admin-products]');
    if (!host) return;
    host.innerHTML = adminProducts.length ? `
      <div class="admin-product-list">
        ${adminProducts.map((product) => `
          <article class="admin-product-row" data-admin-product="${ui().escapeHtml(product.id)}">
            <img src="${ui().escapeHtml(product.image_url)}" alt="${ui().escapeHtml(product.name)}">
            <div>
              <span class="muted">${ui().escapeHtml(product.sku)}</span>
              <h3>${ui().escapeHtml(product.name)}</h3>
              <p>${ui().escapeHtml(product.category_name || '')} · ${db().asMoney(product.price)} · ${Number(product.stock || 0)} шт.</p>
            </div>
            <button class="icon-btn" type="button" data-edit-product="${ui().escapeHtml(product.id)}" aria-label="Редактировать">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-btn icon-btn--danger" type="button" data-delete-product="${ui().escapeHtml(product.id)}" aria-label="Удалить">
              <i data-lucide="trash-2"></i>
            </button>
          </article>
        `).join('')}
      </div>
    ` : '<div class="empty-state empty-state--small"><i data-lucide="package-open"></i><p>Товары не найдены.</p></div>';
    ui().refreshIcons();
  }

  async function loadProducts() {
    [adminProducts, adminCategories] = await Promise.all([db().getProducts(), db().getCategories()]);
    renderProducts();
    await renderProductFormOptions();
  }

  function productPayloadFromForm(form) {
    let specifications = {};
    try {
      specifications = JSON.parse(form.elements.specifications.value || '{}');
    } catch (error) {
      throw new Error('Характеристики должны быть корректным JSON.');
    }
    return {
      name: form.elements.name.value.trim(),
      price: Number(form.elements.price.value),
      description: form.elements.description.value.trim(),
      specifications,
      stock: Number(form.elements.stock.value),
      sku: form.elements.sku.value.trim(),
      category_id: form.elements.category_id.value,
      image_url: form.elements.image_url.value.trim() || null
    };
  }

  function fillProductForm(product) {
    const form = ui().qs('[data-product-form]');
    if (!form) return;
    form.elements.product_id.value = product.id;
    form.elements.name.value = product.name;
    form.elements.price.value = product.price;
    form.elements.description.value = product.description;
    form.elements.specifications.value = JSON.stringify(product.specifications || {}, null, 2);
    form.elements.stock.value = product.stock;
    form.elements.sku.value = product.sku;
    form.elements.category_id.value = product.category_id;
    form.elements.image_url.value = product.image_url || '';
    ui().qs('[data-product-form-title]').textContent = 'Редактирование товара';
    ui().qs('[data-product-reset]').hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetProductForm() {
    const form = ui().qs('[data-product-form]');
    if (!form) return;
    form.reset();
    form.elements.product_id.value = '';
    form.elements.name.value = 'Пустой товар';
    form.elements.specifications.value = JSON.stringify({
      'Материал': 'усиленный композит',
      'Цвет': 'хаки',
      'Гарантия': '12 месяцев'
    }, null, 2);
    ui().qs('[data-product-form-title]').textContent = 'Добавление товара';
    ui().qs('[data-product-reset]').hidden = true;
  }

  function initProductForm() {
    const form = ui().qs('[data-product-form]');
    if (!form) return;
    resetProductForm();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      try {
        ui().setBusy(submit, true, 'Сохраняем');
        const payload = productPayloadFromForm(form);
        const productId = form.elements.product_id.value;
        const product = productId
          ? await db().updateProduct(productId, payload)
          : await db().createProduct(payload);

        const imageFile = form.elements.image_file.files[0];
        if (imageFile) await db().uploadProductImage(product.id, imageFile);

        ui().toast(productId ? 'Товар обновлен' : 'Товар добавлен');
        resetProductForm();
        await loadProducts();
        await renderStats();
      } catch (error) {
        ui().toast(error.message || 'Не удалось сохранить товар', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });

    ui().qs('[data-product-reset]')?.addEventListener('click', resetProductForm);
  }

  function initAdminEvents() {
    ui().qs('[data-admin-orders]')?.addEventListener('change', async (event) => {
      const select = event.target.closest('[data-order-status]');
      if (!select) return;
      try {
        await db().updateOrderStatus(select.dataset.orderStatus, select.value);
        ui().toast('Статус заказа обновлен');
        await renderStats();
      } catch (error) {
        ui().toast(error.message || 'Не удалось обновить статус', 'error');
      }
    });

    ui().qs('[data-admin-products]')?.addEventListener('click', async (event) => {
      const edit = event.target.closest('[data-edit-product]');
      const remove = event.target.closest('[data-delete-product]');
      if (edit) {
        const product = adminProducts.find((item) => item.id === edit.dataset.editProduct);
        if (product) fillProductForm(product);
      }
      if (remove) {
        const product = adminProducts.find((item) => item.id === remove.dataset.deleteProduct);
        if (!product) return;
        const confirmed = window.confirm(`Удалить товар ${product.sku}?`);
        if (!confirmed) return;
        try {
          await db().deleteProduct(product.id);
          ui().toast('Товар удален');
          await loadProducts();
          await renderStats();
        } catch (error) {
          ui().toast(error.message || 'Не удалось удалить товар', 'error');
        }
      }
    });
  }

  async function initAdminPage() {
    const root = ui().qs('[data-admin-page]');
    if (!root) return;
    const allowed = await guardAdmin();
    if (!allowed) return;
    initTabs();
    initProductForm();
    initAdminEvents();
    await Promise.all([renderStats(), renderOrders(), renderUsers(), loadProducts()]);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await initAdminPage();
    } catch (error) {
      ui().toast(error.message || 'Ошибка административной панели', 'error');
    }
  });
})();
