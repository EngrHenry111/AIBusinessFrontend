import axios from 'axios';

// Resolve the backend origin from VITE_API_URL. Tolerates a trailing slash or an
// accidental `/api/v1` suffix so the value works no matter how it's entered.
// When unset (local dev) we fall back to a relative URL and let the Vite proxy
// forward `/api` to localhost:5000.
const RAW_API_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_ORIGIN = RAW_API_URL.replace(/\/api\/v1$/, '');
export const API_BASE = API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1';

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
