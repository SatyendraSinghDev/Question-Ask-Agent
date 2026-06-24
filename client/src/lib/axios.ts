import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const STORAGE_KEYS = {
  accessToken: 'testask.accessToken',
  refreshToken: 'testask.refreshToken',
} as const;

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: unwrap envelope + auto-refresh on 401 ──
let isRefreshing = false;
let pending: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (response) => {
    // Pass through non-JSON (file downloads) as-is
    const envelope = response.data;
    if (envelope && typeof envelope === 'object' && 'success' in envelope) {
      // If the API returned a paginated envelope ({ data: items[], meta.pagination }),
      // reconstruct the Paginated<T> shape that RTK Query hooks expect.
      const pagination = envelope.meta?.pagination;
      if (pagination && Array.isArray(envelope.data)) {
        return {
          ...response,
          data: {
            items: envelope.data,
            total: pagination.total,
            page: pagination.page,
            limit: pagination.limit,
            pages: pagination.pages,
          },
        };
      }
      return { ...response, data: envelope.data, meta: envelope.meta };
    }
    return response;
  },
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefresh } = res.data.data;
          localStorage.setItem(STORAGE_KEYS.accessToken, accessToken);
          localStorage.setItem(STORAGE_KEYS.refreshToken, newRefresh);
          isRefreshing = false;
          pending.forEach((cb) => cb(accessToken));
          pending = [];
        } else {
          const token = await new Promise<string | null>((resolve) => pending.push(resolve));
          if (token) {
            original.headers!.Authorization = `Bearer ${token}`;
            return api(original);
          }
        }
        original.headers!.Authorization = `Bearer ${localStorage.getItem(STORAGE_KEYS.accessToken)}`;
        return api(original);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

/** Extract a friendly message from any axios error. */
export function getApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: { message?: string }; message?: string } | undefined;
    return body?.error?.message ?? body?.message ?? err.message ?? 'Request failed';
  }
  return (err as Error)?.message ?? 'Unknown error';
}
