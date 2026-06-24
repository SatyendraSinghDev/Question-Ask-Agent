import { baseApi } from '../../app/api';
import { STORAGE_KEYS } from '../../lib/axios';
import { setCredentials, logout } from './authSlice';
import type { User } from '../../types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<{ user: User; tokens: { accessToken: string; refreshToken: string } }, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', data: body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          localStorage.setItem(STORAGE_KEYS.accessToken, data.tokens.accessToken);
          localStorage.setItem(STORAGE_KEYS.refreshToken, data.tokens.refreshToken);
          dispatch(setCredentials({ user: data.user }));
        } catch {
          /* handled by caller via getApiError */
        }
      },
    }),

    register: builder.mutation<User, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', data: body }),
    }),

    refresh: builder.mutation<{ accessToken: string; refreshToken: string }, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', data: body }),
    }),

    logout: builder.mutation<{ ok: true }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          localStorage.removeItem(STORAGE_KEYS.accessToken);
          localStorage.removeItem(STORAGE_KEYS.refreshToken);
          dispatch(logout());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),

    me: builder.query<{ userId: string; role: User['role']; email: string }, void>({
      query: () => ({ url: '/auth/me', method: 'GET' }),
    }),

    forgotPassword: builder.mutation<{ sent: boolean }, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', data: body }),
    }),

    resetPassword: builder.mutation<{ ok: true }, { token: string; password: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', data: body }),
    }),

    verifyEmail: builder.mutation<{ ok: true }, { token: string }>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', data: body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useLazyMeQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerifyEmailMutation,
} = authApi;
