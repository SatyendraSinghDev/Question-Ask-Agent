import { baseApi } from '../../app/api';
import type { Paginated, Test } from '../../types';

export interface ListTestsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
}

export const testsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listTests: builder.query<Paginated<Test>, ListTestsParams | void>({
      query: (params) => ({ url: '/tests', method: 'GET', params: params ?? {} }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ _id }) => ({ type: 'Test' as const, id: _id })), { type: 'Test', id: 'LIST' }]
          : [{ type: 'Test', id: 'LIST' }],
    }),
    getTest: builder.query<Test, string>({
      query: (id) => ({ url: `/tests/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Test', id }],
    }),
  }),
});

export const { useListTestsQuery, useGetTestQuery } = testsApi;
