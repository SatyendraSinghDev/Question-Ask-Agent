import { baseApi } from '../../app/api';

export interface GeneratedQuestion {
  text: string;
  textHindi?: string;
  type?: string;
  options?: { key: string; text: string; textHindi?: string }[];
  correctAnswer?: string | string[];
  explanation?: string;
  explanationHindi?: string;
  difficulty?: string;
  marks?: number;
}

export interface GenerationResult {
  logId: string;
  status: string;
  generated: GeneratedQuestion[];
  savedIds: string[];
  savedCount: number;
}

export interface GenerateTextArgs {
  topic: string;
  subject?: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'english' | 'hindi' | 'bilingual';
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'fill_in_the_blank' | 'numerical' | 'assertion_reason';
  autoSave: boolean;
}

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateFromText: builder.mutation<GenerationResult, GenerateTextArgs>({
      query: (body) => ({ url: '/ai/generate/text', method: 'POST', data: body }),
      invalidatesTags: [{ type: 'Question', id: 'LIST' }],
    }),
    aiHealth: builder.query<{ enabled: boolean; provider: string; model: string }, void>({
      query: () => ({ url: '/ai/health', method: 'GET' }),
    }),
  }),
});

export const { useGenerateFromTextMutation, useAiHealthQuery } = aiApi;
