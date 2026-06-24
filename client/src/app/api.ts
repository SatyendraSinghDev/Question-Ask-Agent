import { createApi, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { AxiosError, type AxiosRequestConfig } from 'axios';
import { api, STORAGE_KEYS, getApiError } from '../lib/axios';

/**
 * Thin baseQuery that delegates to the shared axios instance (so we keep the
 * single interceptored client and auto-refresh behaviour).
 */
const axiosBaseQuery =
  (): BaseQueryFn<
    {
      url: string;
      method?: AxiosRequestConfig['method'];
      data?: AxiosRequestConfig['data'];
      params?: AxiosRequestConfig['params'];
      headers?: AxiosRequestConfig['headers'];
    },
    unknown,
    { status: number; message: string; details?: unknown }
  > =>
  async (args) => {
    try {
      const res = await api({ ...args });
      return { data: res.data };
    } catch (err) {
      const e = err as AxiosError;
      return {
        error: {
          status: e.response?.status ?? 0,
          message: getApiError(err),
          details: (e.response?.data as { error?: { details?: unknown } })?.error?.details,
        },
      };
    }
  };

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'User',
    'Subject',
    'Topic',
    'Question',
    'Test',
    'Attempt',
    'Result',
    'Certificate',
    'Dashboard',
  ],
  endpoints: () => ({}),
});

export const { resetApiState } = baseApi.util;

/** Helper to clear local auth on logout. */
export function clearAuthStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
}
