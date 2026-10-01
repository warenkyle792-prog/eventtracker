/**
 * Thin API client: token storage, JSON helpers, uploads and payment polling.
 */

const TOKEN_KEY = 'eventtracker_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable (private mode) — sessions simply won't persist */
  }
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, formData, auth = true, signal } = {}) {
  const headers = {};
  const token = getToken();

  if (auth && token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  let res;

  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: formData ? body : body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Network unavailable — check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON response */
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
      data
    );
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  del: (path, options) => request(path, { ...options, method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData, formData }),
  uploadData: (path, data) => request(path, { method: 'POST', body: { data } }),
};

/** Absolute URL for a stored upload path (works for share links too). */
export function assetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Poll a payment until it reaches a terminal state.
 * The server is the only source of truth — the client merely asks for status.
 */
export function pollPayment(reference, { onUpdate, intervalMs = 2600, timeoutMs = 180000 } = {}) {
  let stopped = false;
  const startedAt = Date.now();

  const tick = async () => {
    if (stopped) return null;

    try {
      const data = await api.get(`/payments/${reference}`);
      onUpdate?.(data);

      const status = data?.transaction?.status;
      if (['successful', 'failed', 'cancelled', 'refunded'].includes(status)) return data;
    } catch (error) {
      if (error.status === 404) throw error;
    }

    if (Date.now() - startedAt > timeoutMs) return null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    return tick();
  };

  const promise = tick();
  promise.cancel = () => {
    stopped = true;
  };
  return promise;
}

export const money = (cents, currency = 'KES') => {
  const value = (Number(cents) || 0) / 100;
  try {
    return new Intl.NumberFormat(currency === 'KES' ? 'en-KE' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
      .format(value)
      .replace(/\u00a0/g, ' ');
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
};
