import { baseApi } from '../../app/api';
import type { Paginated, Question } from '../../types';

export interface ListQuestionsParams {
  page?: number;
  limit?: number;
  search?: string;
  subject?: string;
  topic?: string;
  type?: string;
  difficulty?: string;
  status?: string;
}

export const questionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listQuestions: builder.query<Paginated<Question>, ListQuestionsParams | void>({
      query: (params) => ({ url: '/questions', method: 'GET', params: params ?? {} }),
      providesTags: (r) =>
        r ? [...r.items.map(({ _id }) => ({ type: 'Question' as const, id: _id })), { type: 'Question', id: 'LIST' }] : [{ type: 'Question', id: 'LIST' }],
    }),
    getQuestion: builder.query<Question, string>({
      query: (id) => ({ url: `/questions/${id}`, method: 'GET' }),
      providesTags: (_r, _e, id) => [{ type: 'Question', id }],
    }),
    listSubjects: builder.query<{ items: { _id: string; name: string; slug: string; icon?: string; color?: string }[] }, void>({
      query: () => ({ url: '/subjects', method: 'GET' }),
    }),
    listTopics: builder.query<{ _id: string; name: string; slug: string; subject: string }[], { subject?: string } | void>({
      query: (params) => ({ url: '/topics', method: 'GET', params: params ?? {} }),
    }),
    reviewQuestion: builder.mutation<Question, { id: string; action: 'approve' | 'reject' }>({
      query: ({ id, action }) => ({ url: `/questions/${id}/review`, method: 'POST', data: { action } }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Question', id }, { type: 'Question', id: 'LIST' }],
    }),
  }),
});

export const {
  useListQuestionsQuery,
  useGetQuestionQuery,
  useListSubjectsQuery,
  useListTopicsQuery,
  useReviewQuestionMutation,
} = questionsApi;
