// Small wrapper around fetch() for talking to the KMart API (same origin: /api/...).
// The login token lives in an HttpOnly cookie that the browser sends automatically.
// For requests that change data we also send the CSRF token (copied from its readable cookie).
const API = (() => {
  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.status = status;
      this.errors = errors || [];
    }
  }

  const readCookie = (name) => {
    const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  };

  async function request(method, path, { query, body } = {}) {
    let url = '/api' + path;
    if (query) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, v);
      });
      const qs = params.toString();
      if (qs) url += '?' + qs;
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (method !== 'GET') headers['X-CSRF-Token'] = readCookie('kmart_csrf');

    let res;
    try {
      res = await fetch(url, { method, headers, credentials: 'same-origin', body: body !== undefined ? JSON.stringify(body) : undefined });
    } catch (err) {
      throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
    }
    let data = null;
    try { data = await res.json(); } catch (err) { /* empty or non-JSON body */ }
    if (!res.ok) throw new ApiError((data && data.message) || 'Something went wrong.', res.status, data && data.errors);
    return data;
  }

  return {
    ApiError,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body) => request('POST', path, { body: body || {} }),
    put: (path, body) => request('PUT', path, { body }),
    patch: (path, body) => request('PATCH', path, { body: body || {} }),
    delete: (path) => request('DELETE', path),
  };
})();
