import { baseApi } from '../../app/api';

export interface StudentDashboard {
  attempts: number;
  averageScore: number;
  bestScore: number;
  certificates: number;
  weakTopics: { topic: string; accuracy: number }[];
  strongTopics: { topic: string; accuracy: number }[];
  trend: { date: string; percentage: number; test?: string }[];
}

export interface AdminDashboard {
  users: { total: number; students: number; staff: number };
  tests: { total: number; active: number };
  questions: { total: number; aiGenerated: number };
  certificates: number;
  dailyUsers: { _id: string; count: number }[];
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    studentDashboard: builder.query<StudentDashboard, void>({
      query: () => ({ url: '/dashboard/student', method: 'GET' }),
      providesTags: ['Dashboard'],
    }),
    adminDashboard: builder.query<AdminDashboard, void>({
      query: () => ({ url: '/dashboard/admin', method: 'GET' }),
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useStudentDashboardQuery, useAdminDashboardQuery } = dashboardApi;
