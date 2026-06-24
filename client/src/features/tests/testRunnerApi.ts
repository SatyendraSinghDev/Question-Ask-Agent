import { baseApi } from '../../app/api';
import type { Attempt, Test } from '../../types';

export interface StartAttemptResponse {
  attempt: Attempt;
  resumed?: boolean;
  test: {
    _id: string;
    name: string;
    timerMode: Test['timerMode'];
    durationSeconds?: number;
    totalMarks: number;
    proctoring?: Test['proctoring'];
    questions: unknown[];
  };
}

export interface SaveAnswerArgs {
  attemptId: string;
  questionId: string;
  body: {
    value?: unknown;
    status?: string;
    timeSpentSeconds?: number;
    markedForReview?: boolean;
  };
}

export const testRunnerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    startAttempt: builder.mutation<StartAttemptResponse, string>({
      query: (testId) => ({ url: `/tests/${testId}/attempts`, method: 'POST' }),
    }),
    saveAnswer: builder.mutation<{ saved: true }, SaveAnswerArgs>({
      query: ({ attemptId, questionId, body }) => ({
        url: `/tests/attempts/${attemptId}/save/${questionId}`,
        method: 'POST',
        data: body,
      }),
    }),
    pauseAttempt: builder.mutation<{ paused: true }, string>({
      query: (attemptId) => ({ url: `/tests/attempts/${attemptId}/pause`, method: 'POST' }),
    }),
    submitAttempt: builder.mutation<
      { result: { _id: string }; rank: number; totalParticipants: number },
      { attemptId: string; proctorEvents?: Array<{ type: string; meta?: unknown }> }
    >({
      query: ({ attemptId, proctorEvents }) => ({
        url: `/tests/attempts/${attemptId}/submit`,
        method: 'POST',
        data: { proctorEvents },
      }),
    }),
    logProctor: builder.mutation<{ logged: true }, { attemptId: string; type: string; meta?: unknown }>({
      query: ({ attemptId, type, meta }) => ({
        url: `/tests/attempts/${attemptId}/proctor`,
        method: 'POST',
        data: { type, meta },
      }),
    }),
  }),
});

export const {
  useStartAttemptMutation,
  useSaveAnswerMutation,
  usePauseAttemptMutation,
  useSubmitAttemptMutation,
  useLogProctorMutation,
} = testRunnerApi;
