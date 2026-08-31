(function () {
  'use strict';

  const ui = () => window.SaturnUI;
  const db = () => window.SaturnDB;

  function nextUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('next') || 'profile.html';
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(value));
  }

  function normalizeRussianPhone(value) {
    return db().normalizePhone(value);
  }

  function isValidRussianPhone(value) {
    return /^\+7\d{10}$/.test(normalizeRussianPhone(value));
  }

  function passwordMeetsRequirements(value) {
    const digitCount = (String(value || '').match(/\d/g) || []).length;
    return digitCount >= 8 && /[A-Za-zА-Яа-яЁё]/.test(value);
  }

  function deliverySummary(order) {
    const payload = order.cdek_payload || {};
    if (order.delivery_provider !== 'cdek') return order.address || '-';
    const point = payload.delivery_point || {};
    const status = order.delivery_status === 'created' ? 'отправление создано' : (order.delivery_status || 'ожидает отправки');
    const track = order.cdek_track_number || order.cdek_order_uuid || '';
    return [
      `CDEK: ${status}`,
      payload.city?.city || point.city,
      point.name || point.code,
      track
    ].filter(Boolean).join(' / ');
  }

  async function renderSupabaseStatus() {
    const hosts = ui().qsa('[data-supabase-status]');
    if (!hosts.length) return;
    hosts.forEach((host) => { host.remove(); });
    ui().refreshIcons();
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
        ui().toast('У вас нет доступа к этому разделу', 'error');
        window.location.href = 'profile.html';
        return false;
      }
    }
    return true;
  }

  function initLogin() {
    const form = ui().qs('[data-login-form]');
    if (!form) return;

    const emailInput = form.querySelector('[name="email"]');
    const emailParam = new URLSearchParams(window.location.search).get('email');
    if (emailInput && emailParam && !emailInput.value) {
      emailInput.value = normalizeEmail(emailParam);
    }
    emailInput?.addEventListener('blur', () => {
      emailInput.value = normalizeEmail(emailInput.value);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const email = normalizeEmail(form.querySelector('[name="email"]')?.value || '');
      const password = form.querySelector('[name="password"]')?.value || '';
      if (emailInput) emailInput.value = email;

      if (!db().isReady()) {
        ui().toast('Вход временно недоступен. Попробуйте позже.', 'error');
        return;
      }
      if (!isValidEmail(email)) {
        ui().toast('Введите корректный email', 'error');
        return;
      }
      if (!password) {
        ui().toast('Введите пароль', 'error');
        return;
      }

      try {
        ui().setBusy(submit, true, 'Входим');
        await db().login({ email, password });
        ui().toast('Авторизация выполнена');
        window.location.href = nextUrl();
      } catch (error) {
        ui().toast(db().humanizeSupabaseError(error) || 'Не удалось войти', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });
  }

  function initRegister() {
    const form = ui().qs('[data-register-form]');
    if (!form) return;
    const otpForm = ui().qs('[data-otp-form]');
    const phoneInput = form.querySelector('[name="phone"]');
    const emailInput = form.querySelector('[name="email"]');
    let pendingRegistration = null;

    function syncPhoneInput(force = false) {
      if (!phoneInput) return;
      const normalized = normalizeRussianPhone(phoneInput.value);
      if (force || /^\+7\d{10}$/.test(normalized)) {
        phoneInput.value = normalized;
      }
    }

    phoneInput?.addEventListener('input', () => syncPhoneInput(false));
    phoneInput?.addEventListener('blur', () => syncPhoneInput(true));
    emailInput?.addEventListener('blur', () => {
      emailInput.value = normalizeEmail(emailInput.value);
    });

    function hideExistingNotice() {
      const notice = form.querySelector('[data-existing-account]');
      if (!notice) return;
      notice.hidden = true;
      notice.innerHTML = '';
    }

    function showExistingNotice(result, email) {
      const notice = form.querySelector('[data-existing-account]');
      if (!notice) return;
      const matches = result?.matches || {};
      const contactLabel = matches.email && matches.phone
        ? 'такими email и телефоном'
        : matches.email
          ? 'таким email'
          : 'таким телефоном';
      const loginUrl = matches.email && email
        ? `login.html?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextUrl())}`
        : `login.html?next=${encodeURIComponent(nextUrl())}`;

      notice.innerHTML = `
        <i data-lucide="log-in"></i>
        <span>Аккаунт с ${contactLabel} уже есть. <a href="${loginUrl}">Выполните вход.</a></span>
      `;
      notice.hidden = false;
      ui().refreshIcons();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      hideExistingNotice();
      const submit = form.querySelector('button[type="submit"]');
      const get = (name) => form.querySelector(`[name="${name}"]`)?.value?.trim() || '';
      const fullName = get('fullName');
      const phone = normalizeRussianPhone(get('phone'));
      const email = normalizeEmail(get('email'));
      const password = form.querySelector('[name="password"]')?.value || '';
      const passwordRepeat = form.querySelector('[name="passwordRepeat"]')?.value || '';
      if (phoneInput) phoneInput.value = phone;
      if (emailInput) emailInput.value = email;

      if (!db().isReady()) {
        ui().toast('Регистрация временно недоступна. Попробуйте позже.', 'error');
        return;
      }
      if (fullName.length < 3) {
        ui().toast('Введите ФИО', 'error');
        return;
      }
      if (!isValidRussianPhone(phone)) {
        ui().toast('Введите российский номер в формате +7XXXXXXXXXX', 'error');
        return;
      }
      if (!isValidEmail(email)) {
        ui().toast('Введите корректный email', 'error');
        return;
      }
      if (password !== passwordRepeat) {
        ui().toast('Пароли должны совпадать', 'error');
        return;
      }
      if (!passwordMeetsRequirements(password)) {
        ui().toast('Пароль должен содержать минимум 8 цифр и 1 букву', 'error');
        return;
      }

      try {
        ui().setBusy(submit, true, 'Создаем аккаунт');
        const existingAccount = await db().checkExistingAccount({ email, phone });
        if (existingAccount.exists) {
          showExistingNotice(existingAccount, email);
          ui().toast('Аккаунт уже существует. Выполните вход.', 'error');
          return;
        }

        const data = await db().register({ email, password, fullName, phone });
        pendingRegistration = { email, password, fullName, phone };
        if (data.session) {
          ui().toast('Аккаунт создан, вход выполнен');
          window.location.href = nextUrl();
          return;
        }
        form.hidden = true;
        if (otpForm) {
          otpForm.hidden = false;
          otpForm.dataset.email = email;
          otpForm.querySelector('[name="otp"]')?.focus();
        }
        ui().toast('Код отправлен на email. Введите его для завершения регистрации.');
      } catch (error) {
        ui().toast(db().humanizeSupabaseError(error) || 'Не удалось зарегистрироваться', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });

    if (otpForm) {
      otpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = otpForm.querySelector('button[type="submit"]');
        const token = otpForm.querySelector('[name="otp"]')?.value?.trim() || '';
        const email = otpForm.dataset.email;

        if (!token || token.length < 4) {
          ui().toast('Введите код из письма', 'error');
          return;
        }

        try {
          ui().setBusy(submit, true, 'Проверяем');
          await db().verifyEmailOtp({
            email,
            token,
            password: pendingRegistration?.password,
            fullName: pendingRegistration?.fullName,
            phone: pendingRegistration?.phone
          });
          pendingRegistration = null;
          ui().toast('Почта подтверждена! Входим...');
          window.location.href = nextUrl();
        } catch (error) {
          ui().toast(db().humanizeSupabaseError(error) || 'Неверный код', 'error');
        } finally {
          ui().setBusy(submit, false);
        }
      });

      otpForm.querySelector('[data-resend-otp]')?.addEventListener('click', async () => {
        const resend = otpForm.querySelector('[data-resend-otp]');
        const email = pendingRegistration?.email || otpForm.dataset.email;
        if (!email) {
          ui().toast('Сначала заполните форму регистрации', 'error');
          return;
        }

        try {
          ui().setBusy(resend, true, 'Отправляем');
          await db().resendEmailOtp({
            email,
            fullName: pendingRegistration?.fullName,
            phone: pendingRegistration?.phone
          });
          ui().toast('Код отправлен повторно. Проверьте почту и папку спам.');
        } catch (error) {
          ui().toast(db().humanizeSupabaseError(error) || 'Не удалось отправить код повторно', 'error');
        } finally {
          ui().setBusy(resend, false);
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
          <h2>Личный кабинет временно недоступен</h2>
          <p>Мы уже работаем над восстановлением доступа. Каталог и корзина остаются доступны.</p>
          <a class="btn btn--primary" href="catalog.html"><i data-lucide="grid-3x3"></i><span>Вернуться в каталог</span></a>
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
                    <div class="order-delivery"><span class="muted">Доставка</span><strong>${ui().escapeHtml(deliverySummary(order))}</strong></div>
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
        ui().toast('Не удалось сохранить профиль. Попробуйте позже.', 'error');
      } finally {
        ui().setBusy(submit, false);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await renderSupabaseStatus();
    initLogin();
    initRegister();
    const allowed = await requireAuth();
    if (allowed) {
      try {
        await renderProfile();
      } catch (error) {
        ui().toast(db().humanizeSupabaseError(error) || 'Раздел временно недоступен. Попробуйте позже.', 'error');
      }
    }
  });
})();
