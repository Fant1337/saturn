const DEFAULT_CDEK_BASE_URL = 'https://api.cdek.ru/v2';
const DEFAULT_FROM_LOCATION_CODE = 44;
const DEFAULT_TARIFF_CODE = 136;
const DEFAULT_PACKAGE = {
  weight: 1000,
  length: 30,
  width: 20,
  height: 10
};

let tokenCache = {
  value: null,
  expiresAt: 0
};

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function error(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_CDEK_BASE_URL).replace(/\/+$/, '');
}

function getCdekBaseUrl() {
  if (process.env.CDEK_BASE_URL) return normalizeBaseUrl(process.env.CDEK_BASE_URL);
  if (process.env.CDEK_ENV === 'test') return 'https://api.edu.cdek.ru/v2';
  return DEFAULT_CDEK_BASE_URL;
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function stringEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function cdekConfigured() {
  return Boolean(process.env.CDEK_CLIENT_ID && process.env.CDEK_CLIENT_SECRET);
}

function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_) {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message = payload?.message || payload?.error_description || payload?.error || `HTTP ${response.status}`;
    throw error(response.status, 'REMOTE_API_ERROR', message, payload);
  }

  return payload;
}

async function getCdekToken() {
  if (!cdekConfigured()) {
    throw error(
      503,
      'CDEK_NOT_CONFIGURED',
      'CDEK API не настроен. Добавьте CDEK_CLIENT_ID и CDEK_CLIENT_SECRET в переменные окружения Vercel.'
    );
  }

  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt > now + 30000) {
    return tokenCache.value;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CDEK_CLIENT_ID,
    client_secret: process.env.CDEK_CLIENT_SECRET
  });

  const data = await fetchJson(`${getCdekBaseUrl()}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  tokenCache = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return tokenCache.value;
}

async function cdekFetch(path, options = {}) {
  const token = await getCdekToken();
  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  return fetchJson(`${getCdekBaseUrl()}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

function mapCity(city) {
  return {
    code: city.code,
    city: city.city,
    region: city.region,
    country_code: city.country_code,
    fias_guid: city.fias_guid
  };
}

function mapPoint(point) {
  const location = point.location || {};
  return {
    code: point.code,
    name: point.name || point.code,
    type: point.type,
    address: location.address_full || location.address || '',
    city: location.city,
    city_code: location.city_code,
    region: location.region,
    postal_code: location.postal_code,
    work_time: point.work_time || '',
    phones: Array.isArray(point.phones) ? point.phones.map((phone) => phone.number).filter(Boolean) : [],
    have_cashless: Boolean(point.have_cashless),
    have_cash: Boolean(point.have_cash),
    allowed_cod: Boolean(point.allowed_cod),
    location: {
      longitude: location.longitude,
      latitude: location.latitude
    }
  };
}

function normalizePackages(packages) {
  if (Array.isArray(packages) && packages.length) {
    return packages.map((item, index) => ({
      number: String(item.number || index + 1),
      weight: Math.max(1, Math.ceil(Number(item.weight || DEFAULT_PACKAGE.weight))),
      length: Math.max(1, Math.ceil(Number(item.length || DEFAULT_PACKAGE.length))),
      width: Math.max(1, Math.ceil(Number(item.width || DEFAULT_PACKAGE.width))),
      height: Math.max(1, Math.ceil(Number(item.height || DEFAULT_PACKAGE.height)))
    }));
  }

  return [{
    number: '1',
    ...DEFAULT_PACKAGE
  }];
}

async function searchCities(query) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) {
    throw error(400, 'CITY_QUERY_TOO_SHORT', 'Введите минимум 2 символа для поиска города.');
  }

  const params = new URLSearchParams({
    country_codes: 'RU',
    size: '12',
    city: trimmed
  });
  const data = await cdekFetch(`/location/cities?${params.toString()}`);
  return { cities: (Array.isArray(data) ? data : []).map(mapCity) };
}

async function getDeliveryPoints(cityCode) {
  const code = Number(cityCode);
  if (!Number.isFinite(code) || code <= 0) {
    throw error(400, 'CITY_CODE_REQUIRED', 'Не передан код города СДЭК.');
  }

  const params = new URLSearchParams({
    city_code: String(code),
    is_handout: 'true'
  });
  const type = stringEnv('CDEK_DELIVERY_POINT_TYPE', 'PVZ');
  if (type && type !== 'ALL') params.set('type', type);

  const data = await cdekFetch(`/deliverypoints?${params.toString()}`);
  return { points: (Array.isArray(data) ? data : []).map(mapPoint) };
}

async function calculateTariff(payload) {
  const cityCode = Number(payload.cityCode);
  if (!Number.isFinite(cityCode) || cityCode <= 0) {
    throw error(400, 'CITY_CODE_REQUIRED', 'Выберите город доставки.');
  }

  const data = await cdekFetch('/calculator/tariff', {
    method: 'POST',
    body: {
      tariff_code: numberEnv('CDEK_TARIFF_CODE', DEFAULT_TARIFF_CODE),
      from_location: { code: numberEnv('CDEK_FROM_LOCATION_CODE', DEFAULT_FROM_LOCATION_CODE) },
      to_location: { code: cityCode },
      packages: normalizePackages(payload.packages)
    }
  });
  return { tariff: data };
}

function bearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

async function supabaseFetch(path, options = {}) {
  if (!supabaseConfigured()) {
    throw error(
      503,
      'SUPABASE_SERVER_NOT_CONFIGURED',
      'Для создания отправления CDEK добавьте SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в переменные окружения Vercel.'
    );
  }

  const url = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}${path}`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetchJson(url, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
}

async function getAuthUser(token) {
  if (!token) throw error(401, 'AUTH_REQUIRED', 'Для отправки заказа в CDEK нужно войти в аккаунт.');
  if (!supabaseConfigured()) {
    throw error(503, 'SUPABASE_SERVER_NOT_CONFIGURED', 'На сервере не настроен Supabase service role key.');
  }

  const url = `${process.env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1/user`;
  const data = await fetchJson(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  if (!data?.id) throw error(401, 'AUTH_INVALID', 'Сессия пользователя недействительна.');
  return data;
}

function cleanPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith('7')) return `+${digits}`;
  return String(value || '').trim();
}

function getSpecNumber(specifications, names, fallback) {
  const specs = specifications && typeof specifications === 'object' ? specifications : {};
  const entry = Object.entries(specs).find(([key]) => {
    const normalized = key.toLowerCase();
    return names.some((name) => normalized.includes(name));
  });
  if (!entry) return fallback;
  const value = Number(String(entry[1]).replace(',', '.').match(/\d+(\.\d+)?/)?.[0]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function itemWeight(product) {
  const grams = getSpecNumber(product?.specifications, ['вес, г', 'масса, г', 'weight'], 0);
  if (grams > 0) return Math.ceil(grams);
  const kilograms = getSpecNumber(product?.specifications, ['вес', 'масса'], 0);
  if (kilograms > 0 && kilograms < 100) return Math.ceil(kilograms * 1000);
  return numberEnv('CDEK_DEFAULT_WEIGHT_GRAM', DEFAULT_PACKAGE.weight);
}

function buildOrderPackages(order) {
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  const items = orderItems.map((item) => {
    const product = item.products || {};
    const weight = itemWeight(product);
    return {
      name: String(product.name || 'Товар SATURN').slice(0, 255),
      ware_key: String(product.sku || product.id || item.product_id || 'SATURN').slice(0, 50),
      payment: { value: numberEnv('CDEK_ITEM_PAYMENT_VALUE', 0) },
      cost: Number(item.price || 0),
      weight,
      amount: Number(item.quantity || 1)
    };
  });
  const totalWeight = items.reduce((sum, item) => sum + item.weight * item.amount, 0);

  return [{
    number: String(order.id).slice(0, 8).toUpperCase(),
    weight: Math.max(1, Math.ceil(totalWeight || numberEnv('CDEK_DEFAULT_WEIGHT_GRAM', DEFAULT_PACKAGE.weight))),
    length: numberEnv('CDEK_DEFAULT_LENGTH_CM', DEFAULT_PACKAGE.length),
    width: numberEnv('CDEK_DEFAULT_WIDTH_CM', DEFAULT_PACKAGE.width),
    height: numberEnv('CDEK_DEFAULT_HEIGHT_CM', DEFAULT_PACKAGE.height),
    items
  }];
}

async function loadOrder(orderId) {
  const select = '*,order_items(quantity,price,product_id,products(id,name,sku,price,specifications))';
  const rows = await supabaseFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${encodeURIComponent(select)}`);
  const order = Array.isArray(rows) ? rows[0] : null;
  if (!order) throw error(404, 'ORDER_NOT_FOUND', 'Заказ не найден.');
  return order;
}

async function updateOrder(orderId, payload) {
  const rows = await supabaseFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: payload
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

async function createCdekOrder(payload, req) {
  const orderId = String(payload.orderId || '').trim();
  if (!orderId) throw error(400, 'ORDER_ID_REQUIRED', 'Не передан номер заказа.');

  const user = await getAuthUser(bearerToken(req));
  const order = await loadOrder(orderId);
  if (order.user_id !== user.id) {
    throw error(403, 'ORDER_FORBIDDEN', 'Нельзя отправить чужой заказ в CDEK.');
  }

  const orderPayload = order.cdek_payload || {};
  const deliveryPoint = orderPayload.delivery_point || {};
  if (!deliveryPoint.code) {
    throw error(400, 'DELIVERY_POINT_REQUIRED', 'В заказе не выбран пункт выдачи CDEK.');
  }

  const cdekOrder = {
    type: 1,
    number: `SATURN-${String(order.id).slice(0, 8).toUpperCase()}`,
    tariff_code: Number(orderPayload.tariff?.tariff_code || numberEnv('CDEK_TARIFF_CODE', DEFAULT_TARIFF_CODE)),
    comment: String(orderPayload.comment || `Заказ SATURN ${String(order.id).slice(0, 8).toUpperCase()}`).slice(0, 255),
    delivery_point: deliveryPoint.code,
    recipient: {
      name: order.full_name,
      phones: [{ number: cleanPhone(order.phone) }]
    },
    packages: buildOrderPackages(order)
  };

  if (orderPayload.recipient_email || user.email) {
    cdekOrder.recipient.email = orderPayload.recipient_email || user.email;
  }

  const shipmentPoint = stringEnv('CDEK_SHIPMENT_POINT');
  if (shipmentPoint) {
    cdekOrder.shipment_point = shipmentPoint;
  } else {
    cdekOrder.from_location = { code: numberEnv('CDEK_FROM_LOCATION_CODE', DEFAULT_FROM_LOCATION_CODE) };
  }

  try {
    const cdekResponse = await cdekFetch('/orders', {
      method: 'POST',
      body: cdekOrder
    });
    const entity = cdekResponse?.entity || {};
    const updated = await updateOrder(order.id, {
      delivery_status: 'created',
      cdek_order_uuid: entity.uuid || null,
      cdek_track_number: entity.cdek_number || entity.number || null,
      cdek_payload: {
        ...orderPayload,
        cdek_request: cdekOrder,
        cdek_response: cdekResponse,
        cdek_created_at: new Date().toISOString()
      }
    });
    return { order: updated, cdek: cdekResponse };
  } catch (err) {
    await updateOrder(order.id, {
      delivery_status: 'error',
      cdek_payload: {
        ...orderPayload,
        cdek_error: {
          code: err.code || 'CDEK_ORDER_ERROR',
          message: err.message,
          details: err.details || null,
          at: new Date().toISOString()
        }
      }
    }).catch(() => null);
    throw err;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method === 'GET') {
      return json(res, 200, {
        configured: {
          cdek: cdekConfigured(),
          supabase: supabaseConfigured()
        },
        cdek_base_url: getCdekBaseUrl(),
        from_location_code: numberEnv('CDEK_FROM_LOCATION_CODE', DEFAULT_FROM_LOCATION_CODE),
        tariff_code: numberEnv('CDEK_TARIFF_CODE', DEFAULT_TARIFF_CODE)
      });
    }

    if (req.method !== 'POST') {
      throw error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается.');
    }

    const body = await readBody(req);
    const action = String(body.action || '').trim();
    let result;

    if (action === 'status') {
      result = {
        configured: {
          cdek: cdekConfigured(),
          supabase: supabaseConfigured()
        },
        cdek_base_url: getCdekBaseUrl(),
        from_location_code: numberEnv('CDEK_FROM_LOCATION_CODE', DEFAULT_FROM_LOCATION_CODE),
        tariff_code: numberEnv('CDEK_TARIFF_CODE', DEFAULT_TARIFF_CODE)
      };
    } else if (action === 'cities') {
      result = await searchCities(body.query);
    } else if (action === 'delivery-points') {
      result = await getDeliveryPoints(body.cityCode);
    } else if (action === 'calculate') {
      result = await calculateTariff(body);
    } else if (action === 'create-order') {
      result = await createCdekOrder(body, req);
    } else {
      throw error(400, 'UNKNOWN_ACTION', 'Неизвестное действие CDEK API.');
    }

    return json(res, 200, { ok: true, ...result });
  } catch (err) {
    return json(res, err.status || 500, {
      ok: false,
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Ошибка CDEK API.',
      details: err.details || null
    });
  }
};
