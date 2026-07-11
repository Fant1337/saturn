(function () {
  'use strict';

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;

  function nextUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('next') || 'profile.html';
  }

  async function requireAuth() {
    if (!document.body.dataset.protected) return true;
    if (db().isDemo()) return true;
    const user = await db().currentUser().catch(() => null);
    if (!user) {
      const current = `${window.location.pathname.split('/').pop()}${window.location.search}`;
      window.location.href = `login.html?next=${encodeURIComponent(current)}`;
      return false;
    }
    if (document.body.dataset.admin === 'true') {
      const admin = await db().isAdmin().catch(() => false);
      if (!admin) {
        ui().toast('Доступ только для администратора', 'error');
        window.location.href = 'profile.html';
        return false;
      }
    }
    return true;
  }

  function initLogin() {
    const form = ui().qs('[data-login-form]');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const email = form.elements.email.value;
      const password = form.elements.password.value;

      if (!db().isReady()) {
        ui().toast('Сначала подключите Supabase в форме настройки ниже', 'error');
        return;
      }
      if (!email || !password || password.length < 6) {
        ui().toast('Введите email и пароль минимум из 6 символов', 'error');
        return;
      }

      try {
        ui().setBusy(submit, true, 'Входим');
        await db().login({ email, password });
        ui().toast('Авторизация выполнена');
        window.location.href = nextUrl();
      } catch (error) {
        ui().toast(error.message || 'Не удалось войти', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });
  }

  function initRegister() {
    const form = ui().qs('[data-register-form]');
    if (!form) return;
    const otpForm = ui().qs('[data-otp-form]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const fullName = form.elements.fullName.value.trim();
      const email = form.elements.email.value.trim();
      const phone = form.elements.phone.value.trim();
      const password = form.elements.password.value;
      const passwordRepeat = form.elements.passwordRepeat.value;

      if (!db().isReady()) {
        ui().toast('Сначала подключите Supabase в форме настройки ниже', 'error');
        return;
      }
      if (fullName.length < 3 || !email || !phone) {
        ui().toast('Введите ФИО, email и телефон', 'error');
        return;
      }
      if (password.length < 6 || password !== passwordRepeat) {
        ui().toast('Пароли должны совпадать и содержать минимум 6 символов', 'error');
        return;
      }

      try {
        ui().setBusy(submit, true, 'Отправляем код');
        await db().register({ email, phone, password, fullName });
        form.hidden = true;
        otpForm.hidden = false;
        otpForm.dataset.email = email;
        ui().toast('Код подтверждения отправлен на ' + email);
      } catch (error) {
        ui().toast(error.message || 'Не удалось зарегистрироваться', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });

    if (otpForm) {
      otpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = otpForm.querySelector('button[type="submit"]');
        const token = otpForm.elements.otp.value.trim();
        const email = otpForm.dataset.email;

        if (!token || token.length < 4) {
          ui().toast('Введите код из письма', 'error');
          return;
        }

        try {
          ui().setBusy(submit, true, 'Проверяем');
          await db().verifyEmailOtp({ email, token });
          ui().toast('Почта подтверждена! Входим...');
          window.location.href = nextUrl();
        } catch (error) {
          ui().toast(error.message || 'Неверный код', 'error');
        } finally {
          ui().setBusy(submit, false);
        }
      });
    }
  }

  async function renderProfile() {
    const page = ui().qs('[data-profile-page]');
    if (!page) return;

    if (!db().isReady()) {
      page.innerHTML = `
        <section class="empty-state">
          <i data-lucide="shield-alert"></i>
          <h2>Supabase не настроен</h2>
          <p>Личный кабинет использует авторизацию, профиль, заказы и избранное из Supabase. Добавьте URL и anon key на странице входа.</p>
          <a class="btn btn--primary" href="login.html"><i data-lucide="key-round"></i><span>К настройке</span></a>
        </section>
      `;
      ui().refreshIcons();
      return;
    }

    const [profile, orders, favorites, cart] = await Promise.all([
      db().getProfile(),
      db().getMyOrders().catch(() => []),
      db().getFavorites().catch(() => []),
      db().getCart().catch(() => [])
    ]);

    page.innerHTML = `
      <div class="profile-layout">
        <aside class="profile-sidebar">
          <div class="operator-card">
            <span class="operator-card__mark">SATURN ID</span>
            <h2>${ui().escapeHtml(profile?.full_name || 'Оператор')}</h2>
            <p>${ui().escapeHtml(profile?.phone || 'Телефон не указан')}</p>
            <span class="role-badge">${profile?.role === 'admin' ? 'Admin' : 'User'}</span>
          </div>
          <nav class="tabs tabs--vertical" aria-label="Разделы кабинета">
            <button class="tab is-active" type="button" data-profile-tab="profile"><i data-lucide="user-round"></i>Профиль</button>
            <button class="tab" type="button" data-profile-tab="orders"><i data-lucide="package-check"></i>История заказов</button>
            <button class="tab" type="button" data-profile-tab="favorites"><i data-lucide="heart"></i>Избранное</button>
            <button class="tab" type="button" data-profile-tab="cart"><i data-lucide="shopping-cart"></i>Корзина</button>
            <button class="tab" type="button" data-profile-tab="settings"><i data-lucide="settings"></i>Настройки</button>
          </nav>
        </aside>
        <main class="profile-content">
          <section class="profile-panel is-active" data-profile-panel="profile">
            <div class="section-heading section-heading--compact">
              <span>Профиль</span>
              <h2>Данные оператора</h2>
            </div>
            <div class="info-grid">
              <div class="metric"><span>Телефон</span><strong>${ui().escapeHtml(profile?.phone || '-')}</strong></div>
              <div class="metric"><span>Роль</span><strong>${profile?.role === 'admin' ? 'Admin' : 'User'}</strong></div>
              <div class="metric"><span>Заказов</span><strong>${orders.length}</strong></div>
              <div class="metric"><span>Избранное</span><strong>${favorites.length}</strong></div>
            </div>
          </section>

          <section class="profile-panel" data-profile-panel="orders">
            <div class="section-heading section-heading--compact">
              <span>Заказы</span>
              <h2>История поставок</h2>
            </div>
            ${orders.length ? `
              <div class="order-list">
                ${orders.map((order) => `
                  <article class="order-card">
                    <div>
                      <span class="muted">Заказ</span>
                      <h3>№ ${ui().escapeHtml(order.id.slice(0, 8).toUpperCase())}</h3>
                    </div>
                    <div><span class="muted">Дата</span><strong>${ui().formatDate(order.created_at)}</strong></div>
                    <div><span class="muted">Сумма</span><strong>${db().asMoney(order.total_price)}</strong></div>
                    <div>${ui().renderStatus(order.status)}</div>
                    <ul>${ui().orderItemsList(order)}</ul>
                  </article>
                `).join('')}
              </div>
            ` : '<div class="empty-state empty-state--small"><i data-lucide="package-x"></i><p>Заказов пока нет.</p></div>'}
          </section>

          <section class="profile-panel" data-profile-panel="favorites">
            <div class="section-heading section-heading--compact">
              <span>Избранное</span>
              <h2>Сохраненные позиции</h2>
            </div>
            ${favorites.length ? `<div class="product-grid product-grid--compact">${favorites.map(ui().productCard).join('')}</div>` : '<div class="empty-state empty-state--small"><i data-lucide="heart-off"></i><p>Избранное пусто.</p></div>'}
          </section>

          <section class="profile-panel" data-profile-panel="cart">
            <div class="section-heading section-heading--compact">
              <span>Корзина</span>
              <h2>Текущая комплектация</h2>
            </div>
            ${cart.length ? `
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
              <a class="btn btn--primary" href="cart.html"><i data-lucide="shopping-bag"></i><span>Открыть корзину</span></a>
            ` : '<div class="empty-state empty-state--small"><i data-lucide="shopping-cart"></i><p>Корзина пуста.</p></div>'}
          </section>

          <section class="profile-panel" data-profile-panel="settings">
            <div class="section-heading section-heading--compact">
              <span>Настройки</span>
              <h2>Данные аккаунта</h2>
            </div>
            <form class="form-grid" data-profile-settings>
              <label>
                <span>ФИО</span>
                <input name="full_name" type="text" value="${ui().escapeHtml(profile?.full_name || '')}" required>
              </label>
              <label>
                <span>Телефон</span>
                <input name="phone" type="tel" value="${ui().escapeHtml(profile?.phone || '')}" required>
              </label>
              <button class="btn btn--primary" type="submit"><i data-lucide="save"></i><span>Сохранить</span></button>
              <button class="btn btn--ghost" type="button" data-logout><i data-lucide="log-out"></i><span>Выйти</span></button>
            </form>
          </section>
        </main>
      </div>
    `;

    initProfileTabs();
    initProfileSettings();
    ui().refreshIcons();
  }

  function initProfileTabs() {
    ui().qsa('[data-profile-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.profileTab;
        ui().qsa('[data-profile-tab]').forEach((item) => item.classList.toggle('is-active', item === tab));
        ui().qsa('[data-profile-panel]').forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.profilePanel === target);
        });
      });
    });
  }

  function initProfileSettings() {
    const form = ui().qs('[data-profile-settings]');
    if (!form) return;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      try {
        ui().setBusy(submit, true, 'Сохраняем');
        await db().updateProfile({
          full_name: form.elements.full_name.value,
          phone: form.elements.phone.value
        });
        ui().toast('Профиль обновлен');
        await renderProfile();
      } catch (error) {
        ui().toast(error.message || 'Не удалось сохранить профиль', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    initLogin();
    initRegister();
    const allowed = await requireAuth();
    if (allowed) await renderProfile();
  });
})();
