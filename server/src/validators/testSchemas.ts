import { z } from 'zod';
import { TestStatus, TimerMode } from '../types/enums.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');

const questionRef = z.object({
  question: objectId,
  marksOverride: z.number().min(0).optional(),
  timeLimitSeconds: z.number().min(0).optional(),
});

export const createTestSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(120),
    slug: z.string().trim().toLowerCase().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    subject: objectId.optional(),
    examType: z.enum(['mock', 'practice', 'live', 'timed', 'subjective']).default('practice'),
    status: z.nativeEnum(TestStatus).default(TestStatus.DRAFT),
    questions: z.array(questionRef).default([]),
    totalMarks: z.number().min(0).default(0),
    passingMarks: z.number().min(0).default(0),
    timerMode: z.nativeEnum(TimerMode).default(TimerMode.TEST_LEVEL),
    durationSeconds: z.number().min(0).optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
    windowMode: z.enum(['open', 'scheduled', 'fixed']).default('open'),
    shuffleQuestions: z.boolean().default(false),
    shuffleOptions: z.boolean().default(false),
    negativeMarkingEnabled: z.boolean().default(true),
    showSolutionsAfter: z.boolean().default(true),
    maxAttempts: z.number().int().min(1).default(1),
    proctoring: z
      .object({
        fullscreenRequired: z.boolean().default(true),
        tabSwitchDetection: z.boolean().default(true),
        cameraRequired: z.boolean().default(false),
        maxTabSwitches: z.number().int().min(0).default(3),
      })
      .default({}),
  }),
});

export const listTestsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    category: z.string().optional(),
    status: z.nativeEnum(TestStatus).optional(),
    examType: z.string().optional(),
  }),
});

export const startAttemptSchema = z.object({
  params: z.object({ testId: objectId }),
});

export const saveAnswerSchema = z.object({
  params: z.object({ attemptId: objectId, questionId: objectId }),
  body: z.object({
    value: z.unknown(),
    status: z
      .enum(['not_visited', 'not_answered', 'answered', 'marked', 'answered_marked'])
      .optional(),
    timeSpentSeconds: z.number().min(0).optional(),
    markedForReview: z.boolean().optional(),
  }),
});

export const submitAttemptSchema = z.object({
  params: z.object({ attemptId: objectId }),
  body: z
    .object({
      proctorEvents: z
        .array(
          z.object({
            type: z.enum(['tab_switch', 'fullscreen_exit', 'copy', 'paste', 'window_blur', 'camera_block']),
            at: z.coerce.date().optional(),
            meta: z.unknown().optional(),
          }),
        )
        .optional(),
    })
    .default({}),
});
