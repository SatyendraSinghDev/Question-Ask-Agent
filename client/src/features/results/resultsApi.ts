import { baseApi } from '../../app/api';
import type { Paginated, Result } from '../../types';

export const resultsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    myResults: builder.query<Paginated<Result>, { page?: number; limit?: number } | void>({
      query: (params) => ({ url: '/results/me', method: 'GET', params: params ?? {} }),
      providesTags: ['Result'],
    }),
    getResult: builder.query<Result, string>({
      query: (id) => ({ url: `/results/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Result', id }],
    }),
  }),
});

export const { useMyResultsQuery, useGetResultQuery } = resultsApi;
