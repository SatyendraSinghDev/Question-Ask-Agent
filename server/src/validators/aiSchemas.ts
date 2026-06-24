import { z } from 'zod';
import { Difficulty, Language } from '../types/enums.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

export const generateTextQuestionsSchema = z.object({
  body: z.object({
    topic: z.string().min(2).max(200),
    subject: objectId.optional(),
    count: z.number().int().min(1).max(20).default(5),
    difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
    language: z.nativeEnum(Language).default(Language.ENGLISH),
    type: z
      .enum([
        'single_choice',
        'multiple_choice',
        'true_false',
        'fill_in_the_blank',
        'numerical',
        'assertion_reason',
      ])
      .default('single_choice'),
    autoSave: z.boolean().default(true),
  }),
});

export const generateFromMediaSchema = z.object({
  body: z.object({
    subject: objectId.optional(),
    topic: z.string().optional(),
    count: z.number().int().min(1).max(15).default(5),
    difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
    language: z.nativeEnum(Language).default(Language.ENGLISH),
    autoSave: z.boolean().default(true),
  }),
});

export const evaluateSubjectiveSchema = z.object({
  body: z.object({
    questionId: objectId,
    studentAnswer: z.string().min(1),
    maxMarks: z.number().min(1).default(5),
  }),
});
