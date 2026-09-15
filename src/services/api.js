import axios from 'axios';

// Resolve the backend origin from VITE_API_URL. Tolerates a trailing slash or an
// accidental `/api/v1` suffix so the value works no matter how it's entered.
// When unset — which is now the case in production too, see below — we fall
// back to a relative URL: in local dev the Vite proxy forwards `/api` to
// localhost:5000, and in production vercel.json rewrites `/api/*` straight
// through to the Render API.
//
// That rewrite is deliberate, not an oversight: bislyai.com (this app) and
// the onrender.com API are different sites, so the httpOnly session cookie
// is a *third-party* cookie from the browser's point of view even with
// SameSite=None; Secure set correctly on it — and Safari's ITP, and a
// growing share of Chrome/Firefox users, block third-party cookies outright
// regardless of its attributes. That caused login to appear to succeed (the
// login response itself carries the user/company payload) and then bounce
// back to /login moments later once the first subsequent request went out
// with no cookie attached at all. Routing every API call through a
// same-origin path makes the browser treat the cookie as an ordinary
// first-party one, which no browser blocks.
const RAW_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_ORIGIN = RAW_API_URL.replace(/\/api\/v1$/, '');
export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1';

// Socket.io needs a real absolute origin to connect to — it can't ride the
// same-origin /api rewrite above (that's an HTTP proxy rule, not a WebSocket
// one) — so it's resolved independently of API_BASE. These connections carry
// no auth cookie anyway (company/user membership is asserted via plain
// socket events like join_company), so being cross-site here is harmless.
export const SOCKET_ORIGIN = (import.meta.env.VITE_SOCKET_URL || API_ORIGIN || 'https://businessai-backend-6g8l.onrender.com').trim().replace(/\/+$/, '');

// Surface the resolved URL so a misconfigured deploy is obvious in the console.
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG_API) {
  // eslint-disable-next-line no-console
  console.info('[api] requests go to', API_BASE);
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send/receive the httpOnly auth cookies automatically
  timeout: 60000,
});

// Handle 401 — try refresh token. The access/refresh tokens live only in
// httpOnly cookies now, so there is nothing for JS to attach or read here;
// the browser sends them on its own because of withCredentials above.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
        return api(original);
      } catch (refreshErr) {
        // Only force a hard redirect once the server has explicitly said the
        // session is gone (401/403) — a network blip or a slow cold-start
        // shouldn't kick a still-valid session back to the login page.
        const status = refreshErr.response?.status;
        if ((status === 401 || status === 403) && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }

    // Normalise so every caller can rely on error.response.data.message
    if (!error.response) {
      const friendly = error.code === 'ECONNABORTED'
        ? 'Request timed out. Please try again.'
        : 'Connection error, please retry.';
      error.response = { data: { message: friendly }, status: 0 };
    } else if (error.response.status >= 500 && !error.response.data?.message) {
      error.response.data = { ...error.response.data, message: 'Something went wrong on our side. Please try again.' };
    }

    return Promise.reject(error);
  }
);

export default api;
