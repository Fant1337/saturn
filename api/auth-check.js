const DEFAULT_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 20;

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

function stringEnv(name, fallback = '') {
  return String(process.env[name] || fallback).trim();
}

function getSupabaseUrl() {
  return stringEnv('SUPABASE_URL').replace(/\/+$/, '');
}

function getSupabaseServerKey() {
  return stringEnv('SUPABASE_SECRET_KEY') || stringEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function supabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabaseServerKey());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

function phoneCandidates(phone) {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');
  const candidates = new Set([normalized, digits].filter(Boolean));

  if (digits.length === 10) {
    candidates.add(`+7${digits}`);
    candidates.add(`7${digits}`);
    candidates.add(`8${digits}`);
  }

  if (digits.length === 11) {
    if (digits.startsWith('8')) {
      candidates.add(`+7${digits.slice(1)}`);
      candidates.add(`7${digits.slice(1)}`);
    }
    if (digits.startsWith('7')) {
      candidates.add(`+${digits}`);
      candidates.add(`8${digits.slice(1)}`);
    }
  }

  return Array.from(candidates);
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

function supabaseHeaders(extra = {}) {
  const key = getSupabaseServerKey();
  return {
    Accept: 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra
  };
}

async function supabaseFetch(path, options = {}) {
  if (!supabaseConfigured()) {
    throw error(503, 'SUPABASE_NOT_CONFIGURED', 'Регистрация временно недоступна. Попробуйте позже.');
  }

  return fetchJson(`${getSupabaseUrl()}${path}`, {
    ...options,
    headers: supabaseHeaders(options.headers || {})
  });
}

function isConfirmedAuthUser(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function hasConfirmedEmail(email) {
  const target = normalizeEmail(email);
  if (!target) return false;

  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(DEFAULT_PAGE_SIZE)
    });
    const payload = await supabaseFetch(`/auth/v1/admin/users?${params.toString()}`);
    const users = Array.isArray(payload?.users) ? payload.users : [];
    const matched = users.find((user) => normalizeEmail(user.email) === target);
    if (matched) return isConfirmedAuthUser(matched);
    if (users.length < DEFAULT_PAGE_SIZE) return false;
  }

  throw error(503, 'AUTH_LOOKUP_LIMIT', 'Регистрация временно недоступна. Попробуйте позже.');
}

async function hasProfilePhone(phone) {
  const candidates = phoneCandidates(phone);
  if (!candidates.length) return false;

  for (const candidate of candidates) {
    const params = new URLSearchParams({
      select: 'id',
      phone: `eq.${candidate}`,
      limit: '1'
    });
    const payload = await supabaseFetch(`/rest/v1/users?${params.toString()}`);
    if (Array.isArray(payload) && payload.length > 0) return true;
  }

  return false;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    if (req.method !== 'POST') {
      throw error(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается.');
    }

    const body = await readBody(req);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);

    if (!email && !phone) {
      throw error(400, 'CONTACT_REQUIRED', 'Укажите email или телефон.');
    }

    const [emailExists, phoneExists] = await Promise.all([
      hasConfirmedEmail(email),
      hasProfilePhone(phone)
    ]);

    return json(res, 200, {
      ok: true,
      exists: emailExists || phoneExists,
      matches: {
        email: emailExists,
        phone: phoneExists
      }
    });
  } catch (err) {
    return json(res, err.status || 500, {
      ok: false,
      code: err.code || 'SERVER_ERROR',
      message: err.status && err.status < 500 ? err.message : 'Регистрация временно недоступна. Попробуйте позже.'
    });
  }
};
