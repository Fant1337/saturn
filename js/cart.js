(function () {
  'use strict';

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;
  const cdek = () => window.SaturnCDEK;

  let checkoutDelivery = {
    city: null,
    point: null,
    tariff: null,
    points: []
  };

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
      <div class="summary-row"><span>Доставка</span><strong>${total.subtotal ? 'CDEK при оформлении' : '-'}</strong></div>
      <div class="summary-row summary-row--total"><span>Итого</span><strong>${db().asMoney(total.total)}</strong></div>
      <a class="btn btn--primary btn--wide ${cart.length ? '' : 'is-disabled'}" href="${cart.length ? 'checkout.html' : '#'}">
        <i data-lucide="file-check-2"></i><span>Оформить заказ</span>
      </a>
    `;
  }

  function deliveryPrice() {
    return Number(checkoutDelivery.tariff?.delivery_sum || checkoutDelivery.tariff?.total_sum || 0);
  }

  function pointAddress(point) {
    if (!point) return '';
    const parts = [
      point.name,
      point.address,
      point.code ? `код ${point.code}` : ''
    ].filter(Boolean);
    return parts.join(', ');
  }

  function updateCheckoutSummary(cart) {
    const host = ui().qs('[data-checkout-delivery-summary]');
    if (!host) return;
    const total = totals(cart);
    const delivery = deliveryPrice();
    const deliveryText = checkoutDelivery.point
      ? cdek().tariffText(checkoutDelivery.tariff)
      : 'Выберите ПВЗ';
    host.innerHTML = `
      <div class="summary-row"><span>Товары</span><strong>${db().asMoney(total.subtotal)}</strong></div>
      <div class="summary-row"><span>Доставка CDEK</span><strong>${ui().escapeHtml(deliveryText)}</strong></div>
      <div class="summary-row summary-row--total"><span>Итого</span><strong>${db().asMoney(total.subtotal + delivery)}</strong></div>
    `;
  }

  function renderCdekStatus(status) {
    const host = ui().qs('[data-cdek-status]');
    if (!host) return;
    if (!status) {
      host.className = 'auth-status auth-status--pending';
      host.innerHTML = '<i data-lucide="radio-tower"></i><span>Проверяем доступные пункты выдачи...</span>';
      ui().refreshIcons();
      return;
    }

    const ready = status.configured?.cdek && status.configured?.supabase;
    host.className = `auth-status ${ready ? 'auth-status--ok' : 'auth-status--error'}`;
    host.innerHTML = `
      <i data-lucide="${ready ? 'truck' : 'triangle-alert'}"></i>
      <span>${ready ? 'Выберите город, чтобы увидеть пункты выдачи.' : 'Автоматический выбор пункта выдачи временно недоступен.'}</span>
    `;
    ui().refreshIcons();
  }

  function renderCityResults(cities = []) {
    const host = ui().qs('[data-cdek-city-results]');
    if (!host) return;
    if (!cities.length) {
      host.innerHTML = '<p class="muted">Город не найден. Уточните название.</p>';
      return;
    }
    host.innerHTML = cities.map((city) => `
      <button class="cdek-option" type="button" data-cdek-city="${ui().escapeHtml(city.code)}">
        <strong>${ui().escapeHtml(city.city)}</strong>
        <span>${ui().escapeHtml(city.region || city.country_code || '')}</span>
      </button>
    `).join('');
  }

  function renderPointResults(cart, message = '') {
    const host = ui().qs('[data-cdek-point-results]');
    if (!host) return;
    if (message) {
      host.innerHTML = `<p class="muted">${ui().escapeHtml(message)}</p>`;
      updateCheckoutSummary(cart);
      return;
    }
    if (!checkoutDelivery.city) {
      host.innerHTML = '<p class="muted">Сначала выберите город получения.</p>';
      updateCheckoutSummary(cart);
      return;
    }
    if (!checkoutDelivery.points.length) {
      host.innerHTML = '<p class="muted">В выбранном городе нет доступных ПВЗ CDEK.</p>';
      updateCheckoutSummary(cart);
      return;
    }

    host.innerHTML = checkoutDelivery.points.slice(0, 30).map((point) => {
      const active = checkoutDelivery.point?.code === point.code;
      return `
        <button class="cdek-point ${active ? 'is-selected' : ''}" type="button" data-cdek-point="${ui().escapeHtml(point.code)}">
          <span>
            <strong>${ui().escapeHtml(point.name || point.code)}</strong>
            <small>${ui().escapeHtml(point.address || '')}</small>
          </span>
          <span>${ui().escapeHtml(point.work_time || 'График уточняется')}</span>
        </button>
      `;
    }).join('');
    updateCheckoutSummary(cart);
    ui().refreshIcons();
  }

  async function calculateSelectedDelivery(cart) {
    if (!checkoutDelivery.city || !checkoutDelivery.point || !cdek()) return;
    checkoutDelivery.tariff = null;
    updateCheckoutSummary(cart);
    try {
      checkoutDelivery.tariff = await cdek().calculateDelivery({
        cityCode: checkoutDelivery.city.code,
        deliveryPointCode: checkoutDelivery.point.code,
        packages: cdek().buildPackages(cart)
      });
      updateCheckoutSummary(cart);
    } catch (error) {
      ui().toast('Не удалось рассчитать доставку. Попробуйте позже.', 'error');
    }
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
        ui().toast('Не удалось обновить корзину. Попробуйте позже.', 'error');
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
        ui().toast('Не удалось обновить количество. Попробуйте позже.', 'error');
      }
    });
  }

  async function renderCheckout() {
    const page = ui().qs('[data-checkout-page]');
    if (!page) return;

    checkoutDelivery = {
      city: null,
      point: null,
      tariff: null,
      points: []
    };

    const cart = await db().getCart();
    const profile = !db().isDemo() ? await db().getProfile().catch(() => null) : null;
    const user = !db().isDemo() ? await db().currentUser().catch(() => null) : null;
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
          <label>
            <span>Email для уведомлений CDEK</span>
            <input name="email" type="email" value="${ui().escapeHtml(user?.email || '')}" autocomplete="email">
          </label>
          <div class="checkout-delivery span-2">
            <div class="section-heading section-heading--compact">
              <span>CDEK</span>
              <h2>Пункт получения</h2>
            </div>
            <div data-cdek-status></div>
            <div class="cdek-search">
              <label>
                <span>Город получения</span>
                <input name="cdek_city" type="search" autocomplete="off" placeholder="Например, Москва" data-cdek-city-input required>
              </label>
              <button class="btn btn--secondary" type="button" data-cdek-city-search>
                <i data-lucide="search"></i><span>Найти</span>
              </button>
            </div>
            <div class="cdek-options" data-cdek-city-results></div>
            <div class="cdek-points" data-cdek-point-results>
              <p class="muted">Введите город, чтобы выбрать пункт выдачи CDEK.</p>
            </div>
          </div>
          <label class="span-2">
            <span>Комментарий к заказу</span>
            <textarea name="comment" rows="4" placeholder="Дополнительная информация для менеджера или склада"></textarea>
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
          <div data-checkout-delivery-summary>
            <div class="summary-row"><span>Товары</span><strong>${db().asMoney(total.subtotal)}</strong></div>
            <div class="summary-row"><span>Доставка CDEK</span><strong>Выберите ПВЗ</strong></div>
            <div class="summary-row summary-row--total"><span>Итого</span><strong>${db().asMoney(total.total)}</strong></div>
          </div>
        </aside>
      </div>
    `;
    initCheckoutDelivery(cart);
    initCheckoutSubmit(cart);
    ui().refreshIcons();
  }

  function initCheckoutDelivery(cart) {
    const form = ui().qs('[data-checkout-form]');
    if (!form || !cdek()) return;
    const cityInput = form.querySelector('[data-cdek-city-input]');
    const citySearch = form.querySelector('[data-cdek-city-search]');

    renderCdekStatus(null);
    cdek().status()
      .then(renderCdekStatus)
      .catch((error) => {
        const host = ui().qs('[data-cdek-status]');
        if (host) {
          host.className = 'auth-status auth-status--error';
          host.innerHTML = '<i data-lucide="triangle-alert"></i><span>Служба доставки временно недоступна.</span>';
          ui().refreshIcons();
        }
      });

    async function searchCities() {
      const query = cityInput.value.trim();
      if (query.length < 2) {
        ui().toast('Введите город для поиска CDEK', 'error');
        return;
      }

      try {
        ui().setBusy(citySearch, true, 'Ищем');
        const host = ui().qs('[data-cdek-city-results]');
        if (host) host.innerHTML = '<p class="muted">Ищем города CDEK...</p>';
        const cities = await cdek().searchCities(query);
        renderCityResults(cities);
      } catch (error) {
        const host = ui().qs('[data-cdek-city-results]');
        if (host) host.innerHTML = '<p class="muted">Не удалось найти город. Попробуйте позже.</p>';
      } finally {
        ui().setBusy(citySearch, false);
      }
    }

    citySearch?.addEventListener('click', searchCities);
    cityInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchCities();
      }
    });

    form.addEventListener('click', async (event) => {
      const cityButton = event.target.closest('[data-cdek-city]');
      if (cityButton) {
        const code = Number(cityButton.dataset.cdekCity);
        const label = cityButton.querySelector('strong')?.textContent || '';
        const region = cityButton.querySelector('span')?.textContent || '';
        checkoutDelivery.city = { code, city: label, region };
        checkoutDelivery.point = null;
        checkoutDelivery.tariff = null;
        checkoutDelivery.points = [];
        cityInput.value = region ? `${label}, ${region}` : label;
        const cityResults = ui().qs('[data-cdek-city-results]');
        if (cityResults) cityResults.innerHTML = '';
        renderPointResults(cart, 'Загружаем пункты выдачи CDEK...');

        try {
          const points = await cdek().getDeliveryPoints(code);
          checkoutDelivery.points = points;
          renderPointResults(cart);
        } catch (error) {
          renderPointResults(cart, 'Не удалось загрузить пункты выдачи. Попробуйте позже.');
        }
        return;
      }

      const pointButton = event.target.closest('[data-cdek-point]');
      if (pointButton) {
        const point = checkoutDelivery.points.find((item) => item.code === pointButton.dataset.cdekPoint);
        if (!point) return;
        checkoutDelivery.point = point;
        checkoutDelivery.tariff = null;
        renderPointResults(cart);
        await calculateSelectedDelivery(cart);
      }
    });
  }

  function initCheckoutSubmit(cart) {
    const form = ui().qs('[data-checkout-form]');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      try {
        if (!checkoutDelivery.city || !checkoutDelivery.point) {
          ui().toast('Выберите город и пункт выдачи CDEK', 'error');
          return;
        }
        const comment = form.elements.comment.value.trim();
        const address = pointAddress(checkoutDelivery.point);
        ui().setBusy(submit, true, 'Оформляем');
        const order = await db().createOrder({
          full_name: form.elements.full_name.value.trim(),
          phone: form.elements.phone.value.trim(),
          address: comment ? `${address}. Комментарий: ${comment}` : address,
          delivery_provider: 'cdek',
          delivery_status: 'pending',
          delivery_price: deliveryPrice(),
          cdek_payload: {
            city: checkoutDelivery.city,
            delivery_point: checkoutDelivery.point,
            tariff: checkoutDelivery.tariff,
            packages: cdek()?.buildPackages ? cdek().buildPackages(cart) : [],
            recipient_email: form.elements.email.value.trim(),
            comment
          }
        });
        let cdekResult = null;
        let cdekError = null;
        try {
          cdekResult = await cdek().createOrder(order.id);
        } catch (error) {
          cdekError = error;
        }
        ui().toast(`Заказ № ${order.id.slice(0, 8).toUpperCase()} создан`);
        ui().qs('[data-checkout-page]').innerHTML = `
          <section class="empty-state empty-state--success">
            <i data-lucide="badge-check"></i>
            <h2>Заказ успешно оформлен</h2>
            <p>${cdekResult ? 'Доставка оформлена автоматически. Мы начали обработку заказа.' : 'Заказ сохранен. Менеджер уточнит параметры доставки и свяжется с вами.'}</p>
            <a class="btn btn--primary" href="profile.html"><i data-lucide="user-round"></i><span>Открыть кабинет</span></a>
          </section>
        `;
        await ui().updateCartBadge();
        ui().refreshIcons();
      } catch (error) {
        ui().toast('Не удалось оформить заказ. Попробуйте позже.', 'error');
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
      ui().toast('Раздел временно недоступен. Попробуйте позже.', 'error');
    }
  });

  window.SaturnCart = { renderCart };
})();
