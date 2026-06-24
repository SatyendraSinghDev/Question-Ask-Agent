import { z } from 'zod';
import { Difficulty, Language, QuestionStatus, QuestionType } from '../types/enums.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const optionSchema = z.object({
  key: z.string().min(1).max(8),
  text: z.string().min(1),
  textHindi: z.string().optional(),
});

const matchPairSchema = z.object({
  left: z.string().min(1),
  right: z.string().min(1),
  leftHindi: z.string().optional(),
  rightHindi: z.string().optional(),
});

export const createQuestionSchema = z.object({
  body: z
    .object({
      subject: objectId,
      topic: objectId.optional(),
      type: z.nativeEnum(QuestionType),
      difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
      language: z.nativeEnum(Language).default(Language.ENGLISH),
      text: z.string().min(3, 'Question text is required'),
      textHindi: z.string().optional(),
      passage: z.string().optional(),
      passageHindi: z.string().optional(),
      imageUrl: z.string().url().optional(),
      audioUrl: z.string().url().optional(),
      videoUrl: z.string().url().optional(),
      options: z.array(optionSchema).optional(),
      correctAnswer: z.union([z.string(), z.array(z.string())]).optional(),
      acceptableAnswers: z.array(z.string()).optional(),
      numericalAnswer: z.number().optional(),
      numericalTolerance: z.number().min(0).optional(),
      matchPairs: z.array(matchPairSchema).optional(),
      explanation: z.string().optional(),
      explanationHindi: z.string().optional(),
      marks: z.number().min(0).default(1),
      negativeMarks: z.number().min(0).default(0),
      timeLimitSeconds: z.number().min(0).optional(),
      tags: z.array(z.string()).default([]),
      status: z.nativeEnum(QuestionStatus).default(QuestionStatus.DRAFT),
    })
    .refine((q) => {
      // type-specific sanity checks
      const needsOptions = [
        QuestionType.SINGLE_CHOICE,
        QuestionType.MULTIPLE_CHOICE,
        QuestionType.TRUE_FALSE,
      ].includes(q.type);
      if (needsOptions) return Array.isArray(q.options) && q.options.length >= 2;
      if (q.type === QuestionType.MATCH_THE_FOLLOWING)
        return Array.isArray(q.matchPairs) && q.matchPairs.length >= 2;
      if (q.type === QuestionType.NUMERICAL) return typeof q.numericalAnswer === 'number';
      return true;
    }, 'Question payload does not match its type'),
});

export const listQuestionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    subject: objectId.optional(),
    topic: objectId.optional(),
    type: z.nativeEnum(QuestionType).optional(),
    difficulty: z.nativeEnum(Difficulty).optional(),
    status: z.nativeEnum(QuestionStatus).optional(),
    language: z.nativeEnum(Language).optional(),
    sort: z.string().optional(),
  }),
});

export const reviewQuestionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    note: z.string().optional(),
  }),
});

export const subjectSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().min(2).max(80).optional(),
    description: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    category: z
      .enum(['academic', 'competitive', 'banking', 'engineering', 'medical', 'general'])
      .default('academic'),
  }),
});

export const topicSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    slug: z.string().trim().toLowerCase().optional(),
    subject: objectId,
    parentTopic: objectId.optional(),
    description: z.string().optional(),
    weight: z.number().min(0).max(10).default(1),
  }),
});
