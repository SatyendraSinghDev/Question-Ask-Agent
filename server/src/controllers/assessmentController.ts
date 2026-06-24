import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { Test } from '../models/Test.js';
import { TestAttempt } from '../models/TestAttempt.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AttemptStatus, TestStatus, TimerMode } from '../types/enums.js';
import { gradeAttempt } from '../services/gradingService.js';
import { computeRank } from '../services/rankingService.js';

/**
 * Start a new attempt (or resume an in-progress one).
 * Returns the question list WITHOUT answers/explanations (anti-cheat).
 */
export const startAttempt = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { testId } = req.params as { testId: string };
  const userId = req.principal!.userId;

  const test = await Test.findById(testId)
    .populate({ path: 'questions.question', select: 'type difficulty marks timeLimitSeconds' })
    .lean();
  if (!test) throw ApiError.notFound('Test not found');
  if (![TestStatus.LIVE, TestStatus.SCHEDULED, TestStatus.COMPLETED].includes(test.status as TestStatus)) {
    if (test.status === TestStatus.DRAFT) throw ApiError.badRequest('Test is not published yet');
  }

  // Resume any existing in-progress/paused attempt, otherwise enforce maxAttempts.
  const existing = await TestAttempt.findOne({
    test: testId,
    user: userId,
    status: { $in: [AttemptStatus.IN_PROGRESS, AttemptStatus.PAUSED] },
  }).lean();
  if (existing) {
    return sendSuccess({ res, data: { attempt: existing, resumed: true } });
  }

  const attemptsCount = await TestAttempt.countDocuments({ test: testId, user: userId });
  if (attemptsCount >= (test.maxAttempts ?? 1)) {
    throw ApiError.badRequest('Maximum attempts for this test reached');
  }

  const startedAt = new Date();
  const expiresAt =
    test.timerMode === TimerMode.TEST_LEVEL && test.durationSeconds
      ? new Date(startedAt.getTime() + test.durationSeconds * 1000)
      : undefined;

  const attempt = await TestAttempt.create({
    test: testId,
    user: userId,
    status: AttemptStatus.IN_PROGRESS,
    startedAt,
    expiresAt,
    device: {
      userAgent: req.headers['user-agent'] ?? '',
      ip: req.ip,
    },
    answers: (test.questions as unknown as Array<{ question: { _id: string } }>).map((q) => ({
      questionId: q.question._id,
      status: 'not_visited',
    })),
  });

  return sendSuccess({
    res,
    status: 201,
    data: {
      attempt,
      test: {
        _id: test._id,
        name: test.name,
        timerMode: test.timerMode,
        durationSeconds: test.durationSeconds,
        totalMarks: test.totalMarks,
        proctoring: test.proctoring,
        questions: (test.questions as unknown as Array<{ question: unknown }>).map((q) => q.question),
      },
    },
  });
});

/** Persist a single answer (and proctor status). */
export const saveAnswer = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { attemptId, questionId } = req.params as { attemptId: string; questionId: string };
  const { value, status, timeSpentSeconds, markedForReview } = req.body as {
    value?: unknown;
    status?: string;
    timeSpentSeconds?: number;
    markedForReview?: boolean;
  };

  const attempt = await TestAttempt.findOne({ _id: attemptId, user: req.principal!.userId });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.status === AttemptStatus.SUBMITTED) throw ApiError.badRequest('Attempt already submitted');

  const answers = attempt.answers as Array<{
    questionId: { toString(): string } | string;
    value?: unknown;
    status?: string;
    timeSpentSeconds?: number;
    markedForReview?: boolean;
  }>;
  const idx = answers.findIndex((a) => String(a.questionId) === questionId);
  if (idx === -1) throw ApiError.notFound('Question not in this test');

  answers[idx] = {
    ...answers[idx],
    value,
    status: status ?? (value ? 'answered' : 'not_answered'),
    timeSpentSeconds: timeSpentSeconds ?? answers[idx].timeSpentSeconds ?? 0,
    markedForReview: markedForReview ?? false,
  };
  attempt.answers = answers as never;
  attempt.timeSpentSeconds = (attempt.timeSpentSeconds ?? 0) + (timeSpentSeconds ?? 0);

  await attempt.save();
  return sendSuccess({ res, data: { saved: true } });
});

export const pauseAttempt = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.principal!.userId });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.status !== AttemptStatus.IN_PROGRESS) throw ApiError.badRequest('Attempt is not in progress');
  attempt.status = AttemptStatus.PAUSED;
  attempt.pausedAt = new Date();
  await attempt.save();
  return sendSuccess({ res, data: { paused: true } });
});

export const resumeAttempt = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const attempt = await TestAttempt.findOne({ _id: req.params.attemptId, user: req.principal!.userId });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.status !== AttemptStatus.PAUSED) throw ApiError.badRequest('Attempt is not paused');
  attempt.status = AttemptStatus.IN_PROGRESS;
  attempt.resumedAt = new Date();
  await attempt.save();
  return sendSuccess({ res, data: { resumed: true } });
});

/**
 * Submit attempt → auto-grade → compute rank.
 * Accepts an optional final batch of proctor events for the security log.
 */
export const submitAttempt = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { attemptId } = req.params as { attemptId: string };
  const { proctorEvents } = (req.body ?? {}) as {
    proctorEvents?: Array<{ type: string; at?: Date; meta?: unknown }>;
  };

  const attempt = await TestAttempt.findOne({ _id: attemptId, user: req.principal!.userId });
  if (!attempt) throw ApiError.notFound('Attempt not found');
  if (attempt.status === AttemptStatus.SUBMITTED) throw ApiError.badRequest('Already submitted');

  if (proctorEvents?.length) {
    const existing = (attempt.proctorEvents ?? []) as unknown[];
    attempt.proctorEvents = [...existing, ...proctorEvents] as never;
    attempt.tabSwitchCount = (attempt.tabSwitchCount ?? 0) +
      proctorEvents.filter((e) => e.type === 'tab_switch').length;
    attempt.fullscreenViolations = (attempt.fullscreenViolations ?? 0) +
      proctorEvents.filter((e) => e.type === 'fullscreen_exit').length;
  }

  await attempt.save();

  const { result } = await gradeAttempt(attemptId);
  const resultId = String((result as unknown as { _id: { toString(): string } })._id);
  const { rank, totalParticipants } = await computeRank(resultId);

  return sendSuccess({ res, data: { result, rank, totalParticipants } });
});

/** Log a single proctor event without submitting. */
export const logProctorEvent = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { attemptId } = req.params as { attemptId: string };
  const event = req.body as { type: string; meta?: unknown };
  await TestAttempt.updateOne(
    { _id: attemptId, user: req.principal!.userId },
    { $push: { proctorEvents: { ...event, at: new Date() } } },
  );
  return sendSuccess({ res, data: { logged: true } });
});
