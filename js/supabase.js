(function () {
  'use strict';

  const CONFIG_STORAGE_KEY = 'saturn_supabase_config';
  const CART_STORAGE_KEY = 'saturn_cart_items';
  const FAVORITES_STORAGE_KEY = 'saturn_favorites';
  const PRODUCTS_STORAGE_KEY = 'saturn_products';
  const ORDERS_STORAGE_KEY = 'saturn_orders';
  const USERS_STORAGE_KEY = 'saturn_users';

  const demoCategories = [
    { id: '11111111-1111-4111-8111-111111111111', name: 'Низкие частоты', slug: 'low-frequency', image_url: 'assets/images/antenna-category.png' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Средние частоты', slug: 'mid-frequency', image_url: 'assets/images/antenna-category.png' },
    { id: '33333333-3333-4333-8333-333333333333', name: 'Высокие частоты', slug: 'high-frequency', image_url: 'assets/images/antenna-category.png' }
  ];

  const demoOrders = [
    {
      id: 'dddddddd-0001-4000-9000-000000000001',
      user_id: 'demo-user-1',
      full_name: 'Алексеев Дмитрий Сергеевич',
      phone: '+7 999 111-22-33',
      address: 'г. Москва, ул. Тверская, д. 15, офис 407',
      status: 'Доставлен',
      total_price: 45000,
      created_at: '2026-06-15T14:30:00Z',
      order_items: [
        { quantity: 1, price: 18200, products: { name: 'Антенна спиральная 440-650 L\\R', sku: 'ANT-002', image_url: '' } },
        { quantity: 1, price: 26800, products: { name: 'Антенна спиральная 850-1100 L\\R', sku: 'ANT-004', image_url: '' } }
      ],
      users: { full_name: 'Алексеев Дмитрий Сергеевич', phone: '+7 999 111-22-33', role: 'user' }
    },
    {
      id: 'dddddddd-0002-4000-9000-000000000002',
      user_id: 'demo-user-2',
      full_name: 'Ковалёв Иван Петрович',
      phone: '+7 999 222-33-44',
      address: 'г. Санкт-Петербург, пр. Невский, д. 50, кв. 12',
      status: 'Подтвержден',
      total_price: 119400,
      created_at: '2026-06-18T09:15:00Z',
      order_items: [
        { quantity: 2, price: 31200, products: { name: 'Антенна спиральная 1100-1450 L\\R', sku: 'ANT-005', image_url: '' } },
        { quantity: 1, price: 22500, products: { name: 'Антенна спиральная 650-850 L\\R', sku: 'ANT-003', image_url: '' } },
        { quantity: 1, price: 34500, products: { name: 'Антенна спиральная 1750-2150 L\\R', sku: 'ANT-007', image_url: '' } }
      ],
      users: { full_name: 'Ковалёв Иван Петрович', phone: '+7 999 222-33-44', role: 'user' }
    },
    {
      id: 'dddddddd-0003-4000-9000-000000000003',
      user_id: 'demo-user-3',
      full_name: 'Соколов Андрей Викторович',
      phone: '+7 999 333-44-55',
      address: 'г. Екатеринбург, ул. Ленина, д. 22, офис 315',
      status: 'Отправлен',
      total_price: 55300,
      created_at: '2026-06-20T16:45:00Z',
      order_items: [
        { quantity: 1, price: 22500, products: { name: 'Антенна спиральная 650-850 L\\R', sku: 'ANT-003', image_url: '' } },
        { quantity: 1, price: 32800, products: { name: 'Антенна спиральная 1450-1750 L\\R', sku: 'ANT-006', image_url: '' } }
      ],
      users: { full_name: 'Соколов Андрей Викторович', phone: '+7 999 333-44-55', role: 'user' }
    },
    {
      id: 'dddddddd-0004-4000-9000-000000000004',
      user_id: 'demo-user-4',
      full_name: 'Михайлов Сергей Алексеевич',
      phone: '+7 999 444-55-66',
      address: 'г. Новосибирск, ул. Советская, д. 45, кв. 78',
      status: 'Обрабатывается',
      total_price: 99300,
      created_at: '2026-06-22T11:20:00Z',
      order_items: [
        { quantity: 1, price: 26800, products: { name: 'Антенна спиральная 850-1100 L\\R', sku: 'ANT-004', image_url: '' } },
        { quantity: 1, price: 34500, products: { name: 'Антенна спиральная 1750-2150 L\\R', sku: 'ANT-007', image_url: '' } },
        { quantity: 1, price: 38000, products: { name: 'Антенна спиральная 2450-2750 L\\R', sku: 'ANT-009', image_url: '' } }
      ],
      users: { full_name: 'Михайлов Сергей Алексеевич', phone: '+7 999 444-55-66', role: 'user' }
    },
    {
      id: 'dddddddd-0005-4000-9000-000000000005',
      user_id: 'demo-user-5',
      full_name: 'Попов Александр Игоревич',
      phone: '+7 999 555-66-77',
      address: 'г. Казань, ул. Баумана, д. 10, офис 201',
      status: 'Отменен',
      total_price: 15800,
      created_at: '2026-06-25T08:00:00Z',
      order_items: [
        { quantity: 1, price: 15800, products: { name: 'Антенна спиральная 300-440 L\\R', sku: 'ANT-001', image_url: '' } }
      ],
      users: { full_name: 'Попов Александр Игоревич', phone: '+7 999 555-66-77', role: 'user' }
    }
  ];

  const demoUsers = [
    { id: 'demo-admin-1', full_name: 'Куратов Виктор Сергеевич', phone: '+7 900 000-00-01', role: 'admin', created_at: '2026-05-01T08:00:00Z' },
    { id: 'demo-user-1', full_name: 'Алексеев Дмитрий Сергеевич', phone: '+7 999 111-22-33', role: 'user', created_at: '2026-05-10T10:00:00Z' },
    { id: 'demo-user-2', full_name: 'Ковалёв Иван Петрович', phone: '+7 999 222-33-44', role: 'user', created_at: '2026-05-15T12:00:00Z' },
    { id: 'demo-user-3', full_name: 'Соколов Андрей Викторович', phone: '+7 999 333-44-55', role: 'user', created_at: '2026-05-20T14:00:00Z' },
    { id: 'demo-user-4', full_name: 'Михайлов Сергей Алексеевич', phone: '+7 999 444-55-66', role: 'user', created_at: '2026-06-01T09:00:00Z' },
    { id: 'demo-user-5', full_name: 'Попов Александр Игоревич', phone: '+7 999 555-66-77', role: 'user', created_at: '2026-06-05T16:00:00Z' }
  ];

  function antennaImageUrl(label) {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f5f5f5' rx='6'/%3E%3Crect x='100' y='20' width='200' height='10' rx='2' fill='%23888'/%3E%3Cpath d='M200 32 Q250 50 250 80 Q250 110 200 128 Q150 146 150 176 Q150 206 200 224 Q250 242 250 270' fill='none' stroke='%232c5282' stroke-width='4'/%3E%3Crect x='186' y='270' width='28' height='12' rx='2' fill='%23888'/%3E%3Ctext x='200' y='170' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999'%3E${label}%3C/text%3E%3C/svg%3E`;
  }

  const demoProducts = [
    {
      id: 'aaaaaaaa-0001-4000-9000-000000000001',
      name: 'Антенна спиральная 300-440 L\\R',
      price: 15800,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 300–440 МГц. Обеспечивает коэффициент усиления 7 дБ. Предназначена для подавления каналов управления БПЛА и спутниковой связи.',
      specifications: {
        'Коэффициент усиления (КУ)': '7 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '300–440 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 12,
      sku: 'ANT-001',
      category_id: demoCategories[0].id,
      category_name: 'Низкие частоты',
      category_slug: 'low-frequency',
      image_url: antennaImageUrl('300-440 МГц · 7 дБ'),
      images: [antennaImageUrl('300-440 МГц · 7 дБ')],
      created_at: '2026-06-01T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0002-4000-9000-000000000002',
      name: 'Антенна спиральная 440-650 L\\R',
      price: 18200,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 440–650 МГц. Коэффициент усиления 8 дБ. Применяется в системах связи и подавления сигналов.',
      specifications: {
        'Коэффициент усиления (КУ)': '8 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '440–650 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 10,
      sku: 'ANT-002',
      category_id: demoCategories[0].id,
      category_name: 'Низкие частоты',
      category_slug: 'low-frequency',
      image_url: antennaImageUrl('440-650 МГц · 8 дБ'),
      images: [antennaImageUrl('440-650 МГц · 8 дБ')],
      created_at: '2026-06-02T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0003-4000-9000-000000000003',
      name: 'Антенна спиральная 650-850 L\\R',
      price: 22500,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 650–850 МГц. Коэффициент усиления 10 дБ. Подходит для связи и РЭБ.',
      specifications: {
        'Коэффициент усиления (КУ)': '10 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '650–850 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 8,
      sku: 'ANT-003',
      category_id: demoCategories[0].id,
      category_name: 'Низкие частоты',
      category_slug: 'low-frequency',
      image_url: antennaImageUrl('650-850 МГц · 10 дБ'),
      images: [antennaImageUrl('650-850 МГц · 10 дБ')],
      created_at: '2026-06-03T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0004-4000-9000-000000000004',
      name: 'Антенна спиральная 850-1100 L\\R',
      price: 26800,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 850–1100 МГц. Коэффициент усиления 11 дБ. Высокая направленность вдоль оси.',
      specifications: {
        'Коэффициент усиления (КУ)': '11 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '850–1100 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 7,
      sku: 'ANT-004',
      category_id: demoCategories[1].id,
      category_name: 'Средние частоты',
      category_slug: 'mid-frequency',
      image_url: antennaImageUrl('850-1100 МГц · 11 дБ'),
      images: [antennaImageUrl('850-1100 МГц · 11 дБ')],
      created_at: '2026-06-04T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0005-4000-9000-000000000005',
      name: 'Антенна спиральная 1100-1450 L\\R',
      price: 31200,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 1100–1450 МГц. Коэффициент усиления 12 дБ. Для спутниковой связи и РЭБ.',
      specifications: {
        'Коэффициент усиления (КУ)': '12 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '1100–1450 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 6,
      sku: 'ANT-005',
      category_id: demoCategories[1].id,
      category_name: 'Средние частоты',
      category_slug: 'mid-frequency',
      image_url: antennaImageUrl('1100-1450 МГц · 12 дБ'),
      images: [antennaImageUrl('1100-1450 МГц · 12 дБ')],
      created_at: '2026-06-05T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0006-4000-9000-000000000006',
      name: 'Антенна спиральная 1450-1750 L\\R',
      price: 32800,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 1450–1750 МГц. Коэффициент усиления 12 дБ. Высокая помехоустойчивость.',
      specifications: {
        'Коэффициент усиления (КУ)': '12 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '1450–1750 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 5,
      sku: 'ANT-006',
      category_id: demoCategories[1].id,
      category_name: 'Средние частоты',
      category_slug: 'mid-frequency',
      image_url: antennaImageUrl('1450-1750 МГц · 12 дБ'),
      images: [antennaImageUrl('1450-1750 МГц · 12 дБ')],
      created_at: '2026-06-06T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0007-4000-9000-000000000007',
      name: 'Антенна спиральная 1750-2150 L\\R',
      price: 34500,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 1750–2150 МГц. Коэффициент усиления 12 дБ. Для подавления каналов управления БПЛА.',
      specifications: {
        'Коэффициент усиления (КУ)': '12 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '1750–2150 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 4,
      sku: 'ANT-007',
      category_id: demoCategories[2].id,
      category_name: 'Высокие частоты',
      category_slug: 'high-frequency',
      image_url: antennaImageUrl('1750-2150 МГц · 12 дБ'),
      images: [antennaImageUrl('1750-2150 МГц · 12 дБ')],
      created_at: '2026-06-07T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0008-4000-9000-000000000008',
      name: 'Антенна спиральная 2150-2450 L\\R',
      price: 36200,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 2150–2450 МГц. Коэффициент усиления 12 дБ. Wi-Fi 2,5 ГГц и подавление БПЛА.',
      specifications: {
        'Коэффициент усиления (КУ)': '12 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '2150–2450 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 3,
      sku: 'ANT-008',
      category_id: demoCategories[2].id,
      category_name: 'Высокие частоты',
      category_slug: 'high-frequency',
      image_url: antennaImageUrl('2150-2450 МГц · 12 дБ'),
      images: [antennaImageUrl('2150-2450 МГц · 12 дБ')],
      created_at: '2026-06-08T10:00:00Z'
    },
    {
      id: 'aaaaaaaa-0009-4000-9000-000000000009',
      name: 'Антенна спиральная 2450-2750 L\\R',
      price: 38000,
      description: 'Широкополосная спиральная антенна бегущей волны для диапазона 2450–2750 МГц. Коэффициент усиления 12 дБ. Верхний диапазон для РЭБ.',
      specifications: {
        'Коэффициент усиления (КУ)': '12 дБ',
        'КСВ': 'не более 1,5',
        'Полоса пропускания': '2450–2750 МГц',
        'Мощность': 'до 150 Вт',
        'Поляризация': 'L/R (по требованию)',
        'Разъём': 'N-female',
        'Излучающий элемент': 'медь',
        'Рефлектор': 'алюминий',
        'Корпус': 'пластик'
      },
      stock: 2,
      sku: 'ANT-009',
      category_id: demoCategories[2].id,
      category_name: 'Высокие частоты',
      category_slug: 'high-frequency',
      image_url: antennaImageUrl('2450-2750 МГц · 12 дБ'),
      images: [antennaImageUrl('2450-2750 МГц · 12 дБ')],
      created_at: '2026-06-09T10:00:00Z'
    }
  ];

  let cachedClient = null;

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.warn('Local storage read failed:', error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getConfig() {
    if (window.SATURN_SUPABASE_CONFIG && window.SATURN_SUPABASE_CONFIG.url && window.SATURN_SUPABASE_CONFIG.anonKey) {
      return window.SATURN_SUPABASE_CONFIG;
    }
    return readJson(CONFIG_STORAGE_KEY, null);
  }

  function setConfig(url, anonKey) {
    writeJson(CONFIG_STORAGE_KEY, { url: url.trim(), anonKey: anonKey.trim() });
    cachedClient = null;
  }

  function getClient() {
    const config = getConfig();
    if (!config || !config.url || !config.anonKey || !window.supabase) return null;
    if (!cachedClient) {
      cachedClient = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    }
    return cachedClient;
  }

  function requireClient() {
    const client = getClient();
    if (!client) {
      throw new Error('Supabase не настроен. Добавьте URL проекта и anon key в window.SATURN_SUPABASE_CONFIG или localStorage.');
    }
    return client;
  }

  function normalizePhone(phone) {
    return String(phone || '').replace(/[^\d+]/g, '');
  }

  function asMoney(value) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  }

  function parseSpecs(value) {
    if (!value) return {};
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return { 'Описание': value };
    }
  }

  function normalizeProduct(product) {
    if (!product) return null;
    const images = Array.isArray(product.product_images)
      ? product.product_images
          .slice()
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((item) => item.image_url)
      : product.images || [];

    return {
      ...product,
      image_url: product.image_url || images[0] || 'assets/images/product-1.png',
      images: images.length ? images : [product.image_url || 'assets/images/product-1.png'],
      specifications: parseSpecs(product.specifications),
      category_name: product.category_name || product.categories?.name || '',
      category_slug: product.category_slug || product.categories?.slug || ''
    };
  }

  function localCartItems() {
    return readJson(CART_STORAGE_KEY, []);
  }

  function saveLocalCart(items) {
    writeJson(CART_STORAGE_KEY, items);
    window.dispatchEvent(new CustomEvent('saturn:cart-changed'));
  }

  function localFavoriteIds() {
    return readJson(FAVORITES_STORAGE_KEY, []);
  }

  function saveLocalFavorites(ids) {
    writeJson(FAVORITES_STORAGE_KEY, ids);
    window.dispatchEvent(new CustomEvent('saturn:favorites-changed'));
  }

  async function currentUser() {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function currentSession() {
    const client = getClient();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session || null;
  }

  async function upsertProfile(user, extra = {}) {
    if (!user) return null;
    const client = requireClient();
    const payload = {
      id: user.id,
      phone: normalizePhone(user.phone || extra.phone || user.user_metadata?.phone),
      full_name: extra.full_name || user.user_metadata?.full_name || null
    };
    const { error } = await client.from('users').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return getProfile();
  }

  async function getProfile() {
    const user = await currentUser();
    if (!user) return null;
    const client = requireClient();
    const { data, error } = await client.from('users').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) return upsertProfile(user);
    return data;
  }

  async function updateProfile(payload) {
    const user = await currentUser();
    if (!user) throw new Error('Пользователь не авторизован.');
    const client = requireClient();
    const { data, error } = await client
      .from('users')
      .update({
        full_name: payload.full_name || null,
        phone: normalizePhone(payload.phone)
      })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function register({ email, phone, password, fullName }) {
    const client = requireClient();
    const normalizedPhone = normalizePhone(phone);
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: normalizedPhone,
          role: 'user'
        }
      }
    });
    if (error) throw error;
    if (data.user) await upsertProfile(data.user, { full_name: fullName, phone: normalizedPhone, email });
    return data;
  }

  async function verifyEmailOtp({ email, token }) {
    const client = requireClient();
    const { data, error } = await client.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('saturn:auth-changed'));
    return data;
  }

  async function login({ email, password }) {
    const client = requireClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (data.user) await upsertProfile(data.user, { email });
    window.dispatchEvent(new CustomEvent('saturn:auth-changed'));
    return data;
  }

  async function logout() {
    const client = getClient();
    if (client) await client.auth.signOut();
    window.dispatchEvent(new CustomEvent('saturn:auth-changed'));
  }

  async function isAdmin() {
    const profile = await getProfile().catch(() => null);
    return profile?.role === 'admin';
  }

  async function getCategories() {
    const client = getClient();
    if (!client) return demoCategories.slice();
    const { data, error } = await client.from('categories').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : demoCategories.slice();
  }

  function isDemo() {
    return !getClient();
  }

  function localProducts() {
    return readJson(PRODUCTS_STORAGE_KEY, null);
  }

  function saveLocalProducts(products) {
    writeJson(PRODUCTS_STORAGE_KEY, products);
  }

  function seedLocalProducts() {
    const existing = localProducts();
    if (!existing) {
      saveLocalProducts(demoProducts);
    }
  }

  function _localOrDemoProducts() {
    seedLocalProducts();
    return localProducts() || demoProducts;
  }

  function _localOrDemoOrders() {
    seedLocalOrders();
    return localOrders() || demoOrders;
  }

  function _localOrDemoUsers() {
    seedLocalUsers();
    return localUsers() || demoUsers;
  }

  async function getProducts() {
    const client = getClient();
    if (!client) return _localOrDemoProducts().map(normalizeProduct);
    const { data, error } = await client
      .from('products')
      .select('*, categories(id,name,slug), product_images(id,image_url,alt_text,sort_order)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data && data.length ? data : demoProducts).map(normalizeProduct);
  }

  async function getProduct(id) {
    const client = getClient();
    if (!client) {
      const products = _localOrDemoProducts();
      return normalizeProduct(products.find((product) => product.id === id) || products[0]);
    }
    const { data, error } = await client
      .from('products')
      .select('*, categories(id,name,slug), product_images(id,image_url,alt_text,sort_order)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return normalizeProduct(data);
  }

  async function getSimilarProducts(productId, categoryId, limit = 4) {
    const products = await getProducts();
    return products
      .filter((product) => product.id !== productId && (!categoryId || product.category_id === categoryId))
      .slice(0, limit);
  }

  async function getCart() {
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      const products = await getProducts();
      return localCartItems()
        .map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          product: products.find((product) => product.id === item.product_id)
        }))
        .filter((item) => item.product);
    }

    const { data, error } = await client
      .from('cart_items')
      .select('id, product_id, quantity, products(*, categories(id,name,slug), product_images(id,image_url,alt_text,sort_order))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      product: normalizeProduct(item.products)
    }));
  }

  async function getCartCount() {
    const cart = await getCart().catch(() => []);
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  async function addToCart(productId, quantity = 1) {
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      const items = localCartItems();
      const existing = items.find((item) => item.product_id === productId);
      if (existing) existing.quantity += quantity;
      else items.push({ product_id: productId, quantity });
      saveLocalCart(items);
      return;
    }

    const { data: existing, error: readError } = await client
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (readError) throw readError;

    if (existing) {
      const { error } = await client
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await client
        .from('cart_items')
        .insert({ user_id: user.id, product_id: productId, quantity });
      if (error) throw error;
    }
    window.dispatchEvent(new CustomEvent('saturn:cart-changed'));
  }

  async function updateCartItem(productId, quantity) {
    const normalizedQuantity = Math.max(1, Number(quantity || 1));
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      const items = localCartItems().map((item) => (
        item.product_id === productId ? { ...item, quantity: normalizedQuantity } : item
      ));
      saveLocalCart(items);
      return;
    }

    const { error } = await client
      .from('cart_items')
      .update({ quantity: normalizedQuantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('saturn:cart-changed'));
  }

  async function removeCartItem(productId) {
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      saveLocalCart(localCartItems().filter((item) => item.product_id !== productId));
      return;
    }

    const { error } = await client.from('cart_items').delete().eq('user_id', user.id).eq('product_id', productId);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('saturn:cart-changed'));
  }

  async function clearCart() {
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      saveLocalCart([]);
      return;
    }
    const { error } = await client.from('cart_items').delete().eq('user_id', user.id);
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('saturn:cart-changed'));
  }

  async function getFavorites() {
    const client = getClient();
    const user = await currentUser();
    const products = await getProducts();
    if (!client || !user) {
      const ids = localFavoriteIds();
      return products.filter((product) => ids.includes(product.id));
    }
    const { data, error } = await client
      .from('favorites')
      .select('product_id, products(*, categories(id,name,slug), product_images(id,image_url,alt_text,sort_order))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((item) => normalizeProduct(item.products));
  }

  async function toggleFavorite(productId) {
    const client = getClient();
    const user = await currentUser();
    if (!client || !user) {
      const ids = localFavoriteIds();
      const next = ids.includes(productId) ? ids.filter((id) => id !== productId) : ids.concat(productId);
      saveLocalFavorites(next);
      return next.includes(productId);
    }

    const { data: existing, error: readError } = await client
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();
    if (readError) throw readError;

    if (existing) {
      const { error } = await client.from('favorites').delete().eq('id', existing.id);
      if (error) throw error;
      window.dispatchEvent(new CustomEvent('saturn:favorites-changed'));
      return false;
    }

    const { error } = await client.from('favorites').insert({ user_id: user.id, product_id: productId });
    if (error) throw error;
    window.dispatchEvent(new CustomEvent('saturn:favorites-changed'));
    return true;
  }

  async function createOrder(payload) {
    const client = getClient();
    const cart = await getCart();
    if (!cart.length) throw new Error('Корзина пуста.');

    const total = cart.reduce((sum, item) => sum + Number(item.product.price) * Number(item.quantity), 0);

    if (!client) {
      const orders = _localOrDemoOrders();
      const newOrder = {
        id: crypto.randomUUID(),
        user_id: 'demo-anon',
        full_name: payload.full_name,
        phone: normalizePhone(payload.phone),
        address: payload.address,
        status: 'Обрабатывается',
        total_price: total,
        created_at: new Date().toISOString(),
        order_items: cart.map((item) => ({
          quantity: item.quantity,
          price: item.product.price,
          products: { name: item.product.name, sku: item.product.sku, image_url: item.product.image_url }
        })),
        users: { full_name: payload.full_name, phone: payload.phone, role: 'user' }
      };
      orders.unshift(newOrder);
      saveLocalOrders(orders);
      await clearCart();
      return newOrder;
    }

    const user = await currentUser();
    if (!user) throw new Error('Для оформления заказа необходимо войти.');

    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        user_id: user.id,
        full_name: payload.full_name,
        phone: normalizePhone(payload.phone),
        address: payload.address,
        status: 'Обрабатывается',
        total_price: total
      })
      .select()
      .single();
    if (orderError) throw orderError;

    const orderItems = cart.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.product.price
    }));
    const { error: itemsError } = await client.from('order_items').insert(orderItems);
    if (itemsError) throw itemsError;

    await clearCart();
    return { ...order, items: orderItems };
  }

  async function getMyOrders() {
    const client = getClient();
    if (!client) {
      seedLocalOrders();
      return localOrders() || [];
    }
    const user = await currentUser();
    if (!user) return [];
    const { data, error } = await client
      .from('orders')
      .select('*, order_items(quantity, price, products(id,name,sku,image_url))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function localOrders() {
    return readJson(ORDERS_STORAGE_KEY, null);
  }

  function saveLocalOrders(orders) {
    writeJson(ORDERS_STORAGE_KEY, orders);
  }

  function seedLocalOrders() {
    const existing = localOrders();
    if (!existing) {
      saveLocalOrders(demoOrders);
    }
  }

  function localUsers() {
    return readJson(USERS_STORAGE_KEY, null);
  }

  function saveLocalUsers(users) {
    writeJson(USERS_STORAGE_KEY, users);
  }

  function seedLocalUsers() {
    const existing = localUsers();
    if (!existing) {
      saveLocalUsers(demoUsers);
    }
  }

  async function getAllOrders() {
    const client = getClient();
    if (!client) {
      seedLocalOrders();
      return localOrders() || [];
    }
    const { data, error } = await client
      .from('orders')
      .select('*, users(full_name,phone,role), order_items(quantity, price, products(id,name,sku))')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function updateOrderStatus(orderId, status) {
    const client = getClient();
    if (!client) {
      const orders = _localOrDemoOrders();
      const index = orders.findIndex((o) => o.id === orderId);
      if (index === -1) throw new Error('Заказ не найден');
      orders[index].status = status;
      saveLocalOrders(orders);
      return orders[index];
    }
    const { data, error } = await client.from('orders').update({ status }).eq('id', orderId).select().single();
    if (error) throw error;
    return data;
  }

  async function getUsers() {
    const client = getClient();
    if (!client) {
      seedLocalUsers();
      return localUsers() || [];
    }
    const { data, error } = await client.from('users').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function createProduct(payload) {
    const client = getClient();
    if (!client) {
      const products = _localOrDemoProducts();
      const newProduct = {
        id: crypto.randomUUID(),
        name: payload.name,
        price: Number(payload.price),
        description: payload.description || '',
        specifications: typeof payload.specifications === 'object' ? payload.specifications : {},
        stock: Number(payload.stock || 0),
        sku: payload.sku || '',
        category_id: payload.category_id || demoCategories[0].id,
        category_name: demoCategories.find((c) => c.id === payload.category_id)?.name || '',
        category_slug: demoCategories.find((c) => c.id === payload.category_id)?.slug || '',
        image_url: payload.image_url || 'assets/images/product-1.png',
        images: [payload.image_url || 'assets/images/product-1.png'],
        created_at: new Date().toISOString()
      };
      products.unshift(newProduct);
      saveLocalProducts(products);
      return normalizeProduct(newProduct);
    }
    const { data, error } = await client.from('products').insert(payload).select().single();
    if (error) throw error;
    return normalizeProduct(data);
  }

  async function updateProduct(id, payload) {
    const client = getClient();
    if (!client) {
      const products = _localOrDemoProducts();
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) throw new Error('Товар не найден');
      const updated = {
        ...products[index],
        ...payload,
        price: payload.price !== undefined ? Number(payload.price) : products[index].price,
        stock: payload.stock !== undefined ? Number(payload.stock) : products[index].stock,
        specifications: payload.specifications ? (typeof payload.specifications === 'object' ? payload.specifications : {}) : products[index].specifications,
        category_id: payload.category_id || products[index].category_id,
        category_name: payload.category_id ? (demoCategories.find((c) => c.id === payload.category_id)?.name || products[index].category_name) : products[index].category_name,
        category_slug: payload.category_id ? (demoCategories.find((c) => c.id === payload.category_id)?.slug || products[index].category_slug) : products[index].category_slug,
        image_url: payload.image_url || products[index].image_url
      };
      products[index] = updated;
      saveLocalProducts(products);
      return normalizeProduct(updated);
    }
    const { data, error } = await client.from('products').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return normalizeProduct(data);
  }

  async function deleteProduct(id) {
    const client = getClient();
    if (!client) {
      const products = _localOrDemoProducts();
      saveLocalProducts(products.filter((p) => p.id !== id));
      return;
    }
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async function uploadProductImage(productId, file) {
    if (!file) return null;
    const client = getClient();
    if (!client) {
      const url = URL.createObjectURL(file);
      const products = _localOrDemoProducts();
      const index = products.findIndex((p) => p.id === productId);
      if (index !== -1) {
        products[index].image_url = url;
        if (!products[index].images) products[index].images = [];
        if (!products[index].images.includes(url)) products[index].images.unshift(url);
        saveLocalProducts(products);
      }
      return url;
    }
    const extension = file.name.split('.').pop() || 'png';
    const filePath = `${productId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from('product-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (uploadError) throw uploadError;

    const { data: publicData } = client.storage.from('product-images').getPublicUrl(filePath);
    const imageUrl = publicData.publicUrl;
    const { error: imageError } = await client
      .from('product_images')
      .insert({ product_id: productId, image_url: imageUrl, alt_text: 'Изображение товара', sort_order: 0 });
    if (imageError) throw imageError;

    await client.from('products').update({ image_url: imageUrl }).eq('id', productId);
    return imageUrl;
  }

  async function getStats() {
    const [products, users, orders] = await Promise.all([
      getProducts(),
      getUsers().catch(() => []),
      getAllOrders().catch(() => [])
    ]);
    const revenue = orders.reduce((sum, order) => sum + Number(order.total_price || 0), 0);
    return {
      products: products.length,
      users: users.length,
      orders: orders.length,
      revenue: revenue
    };
  }

  window.SaturnDB = {
    CONFIG_STORAGE_KEY,
    PRODUCTS_STORAGE_KEY,
    ORDERS_STORAGE_KEY,
    USERS_STORAGE_KEY,
    demoCategories,
    demoProducts,
    demoOrders,
    demoUsers,
    getConfig,
    setConfig,
    getClient,
    isReady: () => Boolean(getClient()),
    isDemo,
    normalizePhone,
    asMoney,
    parseSpecs,
    currentUser,
    currentSession,
    getProfile,
    updateProfile,
    register,
    verifyEmailOtp,
    login,
    logout,
    isAdmin,
    getCategories,
    getProducts,
    getProduct,
    getSimilarProducts,
    getCart,
    getCartCount,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    getFavorites,
    toggleFavorite,
    createOrder,
    getMyOrders,
    getAllOrders,
    updateOrderStatus,
    getUsers,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    getStats
  };
})();
