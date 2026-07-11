(function () {
  'use strict';

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;

  function totals(cart) {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * Number(item.quantity || 0), 0);
    const delivery = subtotal > 0 ? 0 : 0;
    return { subtotal, delivery, total: subtotal + delivery };
  }

  function renderSummary(cart) {
    const host = ui().qs('[data-cart-summary]');
    if (!host) return;
    const total = totals(cart);
    host.innerHTML = `
      <div class="summary-row"><span>Товары</span><strong>${db().asMoney(total.subtotal)}</strong></div>
      <div class="summary-row"><span>Доставка</span><strong>${total.subtotal ? 'Расчет менеджером' : '-'}</strong></div>
      <div class="summary-row summary-row--total"><span>Итого</span><strong>${db().asMoney(total.total)}</strong></div>
      <a class="btn btn--primary btn--wide ${cart.length ? '' : 'is-disabled'}" href="${cart.length ? 'checkout.html' : '#'}">
        <i data-lucide="file-check-2"></i><span>Оформить заказ</span>
      </a>
    `;
  }

  async function renderCart() {
    const host = ui().qs('[data-cart-list]');
    if (!host) return;
    const cart = await db().getCart();

    if (!cart.length) {
      host.innerHTML = `
        <section class="empty-state">
          <i data-lucide="shopping-cart"></i>
          <h2>Корзина пуста</h2>
          <p>Добавьте позиции из каталога, чтобы сформировать заказ.</p>
          <a class="btn btn--primary" href="catalog.html"><i data-lucide="grid-3x3"></i><span>Перейти в каталог</span></a>
        </section>
      `;
      renderSummary(cart);
      ui().refreshIcons();
      return;
    }

    host.innerHTML = cart.map((item) => `
      <article class="cart-item" data-cart-item="${ui().escapeHtml(item.product_id)}">
        <a class="cart-item__image" href="product.html?id=${encodeURIComponent(item.product_id)}">
          <img src="${ui().escapeHtml(item.product.image_url)}" alt="${ui().escapeHtml(item.product.name)}">
        </a>
        <div class="cart-item__main">
          <span class="muted">${ui().escapeHtml(item.product.sku)}</span>
          <h3>${ui().escapeHtml(item.product.name)}</h3>
          <p>${ui().escapeHtml(item.product.description)}</p>
        </div>
        <div class="cart-item__qty">
          <button class="icon-btn" type="button" data-cart-minus aria-label="Уменьшить"><i data-lucide="minus"></i></button>
          <input type="number" min="1" value="${Number(item.quantity)}" data-cart-qty aria-label="Количество">
          <button class="icon-btn" type="button" data-cart-plus aria-label="Увеличить"><i data-lucide="plus"></i></button>
        </div>
        <div class="cart-item__price">
          <strong>${db().asMoney(Number(item.product.price) * Number(item.quantity))}</strong>
          <span>${db().asMoney(item.product.price)} / шт.</span>
        </div>
        <button class="icon-btn icon-btn--danger" type="button" data-cart-remove aria-label="Удалить">
          <i data-lucide="trash-2"></i>
        </button>
      </article>
    `).join('');

    renderSummary(cart);
    ui().refreshIcons();
  }

  function initCartEvents() {
    const host = ui().qs('[data-cart-list]');
    if (!host) return;

    host.addEventListener('click', async (event) => {
      const item = event.target.closest('[data-cart-item]');
      if (!item) return;
      const productId = item.dataset.cartItem;
      const input = item.querySelector('[data-cart-qty]');
      try {
        if (event.target.closest('[data-cart-minus]')) {
          input.value = Math.max(1, Number(input.value) - 1);
          await db().updateCartItem(productId, Number(input.value));
          await renderCart();
        }
        if (event.target.closest('[data-cart-plus]')) {
          input.value = Number(input.value) + 1;
          await db().updateCartItem(productId, Number(input.value));
          await renderCart();
        }
        if (event.target.closest('[data-cart-remove]')) {
          await db().removeCartItem(productId);
          ui().toast('Товар удален из корзины');
          await renderCart();
        }
      } catch (error) {
        ui().toast(error.message || 'Не удалось обновить корзину', 'error');
      }
    });

    host.addEventListener('change', async (event) => {
      const input = event.target.closest('[data-cart-qty]');
      if (!input) return;
      const item = event.target.closest('[data-cart-item]');
      try {
        await db().updateCartItem(item.dataset.cartItem, Math.max(1, Number(input.value || 1)));
        await renderCart();
      } catch (error) {
        ui().toast(error.message || 'Не удалось обновить количество', 'error');
      }
    });
  }

  async function renderCheckout() {
    const page = ui().qs('[data-checkout-page]');
    if (!page) return;

    const cart = await db().getCart();
    const profile = !db().isDemo() ? await db().getProfile().catch(() => null) : null;
    if (!cart.length) {
      page.innerHTML = `
        <section class="empty-state">
          <i data-lucide="shopping-cart"></i>
          <h2>Корзина пуста</h2>
          <a class="btn btn--primary" href="catalog.html"><i data-lucide="grid-3x3"></i><span>В каталог</span></a>
        </section>
      `;
      ui().refreshIcons();
      return;
    }

    const total = totals(cart);
    page.innerHTML = `
      <div class="checkout-layout">
        <form class="checkout-form" data-checkout-form>
          <div class="section-heading section-heading--compact">
            <span>Оформление</span>
            <h2>Данные доставки</h2>
          </div>
          <label>
            <span>ФИО</span>
            <input name="full_name" type="text" value="${ui().escapeHtml(profile?.full_name || '')}" required>
          </label>
          <label>
            <span>Телефон</span>
            <input name="phone" type="tel" value="${ui().escapeHtml(profile?.phone || '')}" required>
          </label>
          <label class="span-2">
            <span>Адрес доставки</span>
            <textarea name="address" rows="5" required placeholder="Город, улица, дом, комментарий для логистики"></textarea>
          </label>
          <button class="btn btn--primary btn--wide" type="submit">
            <i data-lucide="send"></i><span>Подтвердить заказ</span>
          </button>
        </form>
        <aside class="checkout-summary">
          <div class="section-heading section-heading--compact">
            <span>Комплектация</span>
            <h2>Состав заказа</h2>
          </div>
          <div class="mini-cart-list">
            ${cart.map((item) => `
              <div class="mini-cart-row">
                <img src="${ui().escapeHtml(item.product.image_url)}" alt="${ui().escapeHtml(item.product.name)}">
                <div>
                  <strong>${ui().escapeHtml(item.product.name)}</strong>
                  <span>${item.quantity} × ${db().asMoney(item.product.price)}</span>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="summary-row summary-row--total"><span>Итого</span><strong>${db().asMoney(total.total)}</strong></div>
        </aside>
      </div>
    `;
    initCheckoutSubmit();
    ui().refreshIcons();
  }

  function initCheckoutSubmit() {
    const form = ui().qs('[data-checkout-form]');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      try {
        ui().setBusy(submit, true, 'Оформляем');
        const order = await db().createOrder({
          full_name: form.elements.full_name.value.trim(),
          phone: form.elements.phone.value.trim(),
          address: form.elements.address.value.trim()
        });
        ui().toast(`Заказ № ${order.id.slice(0, 8).toUpperCase()} создан`);
        ui().qs('[data-checkout-page]').innerHTML = `
          <section class="empty-state empty-state--success">
            <i data-lucide="badge-check"></i>
            <h2>Заказ успешно оформлен</h2>
            <p>Статус заказа: Обрабатывается. Данные уже доступны в административной панели.</p>
            <a class="btn btn--primary" href="profile.html"><i data-lucide="user-round"></i><span>Открыть кабинет</span></a>
          </section>
        `;
        await ui().updateCartBadge();
        ui().refreshIcons();
      } catch (error) {
        ui().toast(error.message || 'Не удалось оформить заказ', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await renderCart();
      initCartEvents();
      await renderCheckout();
    } catch (error) {
      ui().toast(error.message || 'Ошибка корзины', 'error');
    }
  });

  window.SaturnCart = { renderCart };
})();
