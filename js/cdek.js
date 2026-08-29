(function () {
  'use strict';

  const DEFAULT_PACKAGE = {
    weight: 1000,
    length: 30,
    width: 20,
    height: 10
  };

  function db() {
    return window.SaturnDB;
  }

  async function request(action, payload = {}, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (options.auth) {
      const session = await db().currentSession().catch(() => null);
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    }

    let response;
    try {
      response = await fetch('/api/cdek', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...payload })
      });
    } catch (_) {
      throw new Error('Служба доставки временно недоступна.');
    }

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok || data?.ok === false) {
      const code = data?.code || '';
      if (code === 'CITY_QUERY_TOO_SHORT') {
        throw new Error(data?.message || 'Введите минимум 2 символа для поиска города.');
      }
      if (code === 'CITY_CODE_REQUIRED') {
        throw new Error(data?.message || 'Выберите город доставки.');
      }
      throw new Error('Служба доставки временно недоступна. Попробуйте позже.');
    }
    return data;
  }

  async function status() {
    return request('status');
  }

  async function searchCities(query) {
    const data = await request('cities', { query });
    return data.cities || [];
  }

  async function getDeliveryPoints(cityCode) {
    const data = await request('delivery-points', { cityCode });
    return data.points || [];
  }

  async function calculateDelivery(payload) {
    const data = await request('calculate', payload);
    return data.tariff || null;
  }

  async function createOrder(orderId) {
    return request('create-order', { orderId }, { auth: true });
  }

  function numberFromSpec(specifications, names, fallback) {
    const specs = db().parseSpecs(specifications);
    const entry = Object.entries(specs).find(([key]) => {
      const normalized = key.toLowerCase();
      return names.some((name) => normalized.includes(name));
    });
    const value = Number(String(entry?.[1] || '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function productWeight(product) {
    const grams = numberFromSpec(product.specifications, ['вес, г', 'масса, г', 'weight'], 0);
    if (grams > 0) return Math.ceil(grams);
    const kilograms = numberFromSpec(product.specifications, ['вес', 'масса'], 0);
    if (kilograms > 0 && kilograms < 100) return Math.ceil(kilograms * 1000);
    return DEFAULT_PACKAGE.weight;
  }

  function buildPackages(cart) {
    const weight = cart.reduce((sum, item) => {
      return sum + productWeight(item.product || {}) * Number(item.quantity || 1);
    }, 0);
    return [{
      number: '1',
      weight: Math.max(1, Math.ceil(weight || DEFAULT_PACKAGE.weight)),
      length: DEFAULT_PACKAGE.length,
      width: DEFAULT_PACKAGE.width,
      height: DEFAULT_PACKAGE.height
    }];
  }

  function tariffText(tariff) {
    if (!tariff) return 'Выберите пункт выдачи';
    const sum = Number(tariff.delivery_sum || tariff.total_sum || 0);
    const price = sum > 0 ? db().asMoney(sum) : 'по тарифу CDEK';
    const min = Number(tariff.period_min || 0);
    const max = Number(tariff.period_max || 0);
    if (min && max) return `${price}, ${min}-${max} дн.`;
    if (min) return `${price}, от ${min} дн.`;
    return price;
  }

  window.SaturnCDEK = {
    status,
    searchCities,
    getDeliveryPoints,
    calculateDelivery,
    createOrder,
    buildPackages,
    tariffText
  };
})();
