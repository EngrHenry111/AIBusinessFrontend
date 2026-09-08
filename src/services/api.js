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
  withCredentials: true,
  timeout: 60000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 — try refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
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
