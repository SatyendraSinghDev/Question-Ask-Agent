import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { slugify } from '../utils/text.js';
import { TestStatus } from '../types/enums.js';

// ─────────────────────────── Test CRUD ───────────────────────────

export const createTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as Record<string, unknown> & { name: string; slug?: string };
  const totalMarks = (body.questions as Array<{ marksOverride?: number }>)?.reduce(
    (s, q) => s + (q.marksOverride ?? 1),
    0,
  );
  const test = await Test.create({
    ...body,
    slug: body.slug || slugify(body.name),
    totalMarks: typeof body.totalMarks === 'number' ? body.totalMarks : totalMarks ?? 0,
    createdBy: req.principal!.userId,
  });
  return sendSuccess({ res, status: 201, data: test });
});

export const listTests = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { page, limit, search, category, status, examType } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (status) filter.status = status;
  if (examType) filter.examType = examType;
  if (search) filter.$text = { $search: search };

  // Students see only scheduled/live/completed tests
  if (req.principal?.role === 'student') {
    filter.status = { $in: [TestStatus.SCHEDULED, TestStatus.LIVE, TestStatus.COMPLETED] };
  }

  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 20);
  const [items, total] = await Promise.all([
    Test.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
    Test.countDocuments(filter),
  ]);
  return sendPaginated(res, { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

export const getTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findById(req.params.id).populate('questions.question', 'type difficulty marks').lean();
  if (!test) throw ApiError.notFound('Test not found');
  return sendSuccess({ res, data: test });
});

export const updateTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).lean();
  if (!test) throw ApiError.notFound('Test not found');
  return sendSuccess({ res, data: test });
});

export const deleteTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const r = await Test.deleteOne({ _id: req.params.id });
  if (r.deletedCount === 0) throw ApiError.notFound('Test not found');
  return sendSuccess({ res, data: { ok: true } });
});

export const publishTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const test = await Test.findByIdAndUpdate(
    req.params.id,
    { $set: { status: TestStatus.LIVE, publishedAt: new Date() } },
    { new: true },
  ).lean();
  if (!test) throw ApiError.notFound('Test not found');
  return sendSuccess({ res, data: test });
});

/**
 * Smart Test Creation — auto-assemble a test from the question bank
 * given subject/topic distribution + difficulty mix.
 */
export const autoAssembleTest = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { subjectId, count, difficultySplit, name } = req.body as {
    subjectId: string;
    count: number;
    difficultySplit?: { easy: number; medium: number; hard: number };
    name?: string;
  };

  const split = difficultySplit ?? { easy: 0.3, medium: 0.5, hard: 0.2 };
  const counts = {
    easy: Math.round(count * split.easy),
    medium: Math.round(count * split.medium),
    hard: Math.max(0, count - Math.round(count * split.easy) - Math.round(count * split.medium)),
  };

  const [easy, medium, hard] = await Promise.all([
    sampleQuestions(subjectId, 'easy', counts.easy),
    sampleQuestions(subjectId, 'medium', counts.medium),
    sampleQuestions(subjectId, 'hard', counts.hard),
  ]);

  const picked = [...easy, ...medium, ...hard];
  return sendSuccess({
    res,
    data: {
      name: name ?? 'Auto-generated Test',
      questions: picked.map((q) => ({ question: q._id })),
      totalMarks: picked.length,
      distribution: { easy: easy.length, medium: medium.length, hard: hard.length },
    },
  });
});

async function sampleQuestions(subjectId: string, difficulty: string, n: number) {
  if (n <= 0) return [];
  return Question.aggregate([
    { $match: { subject: subjectId as never, difficulty, status: 'approved' } },
    { $sample: { size: n } },
    { $project: { _id: 1, type: 1, marks: 1 } },
  ]);
}
