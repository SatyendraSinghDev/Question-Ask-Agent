import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { Question } from '../models/Question.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { QuestionStatus } from '../types/enums.js';
import { slugify } from '../utils/text.js';

// ─────────────────────────── Subjects ───────────────────────────

export const createSubject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    category?: string;
  };
  const subject = await Subject.create({
    ...body,
    slug: body.slug || slugify(body.name),
    createdBy: req.principal!.userId,
  });
  return sendSuccess({ res, status: 201, data: subject });
});

export const listSubjects = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 50);
  const search = req.query.search as string | undefined;
  const q = search ? { $text: { $search: search } } : {};
  const [items, total] = await Promise.all([
    Subject.find(q).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Subject.countDocuments(q),
  ]);
  return sendPaginated(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const getSubject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const subject = await Subject.findById(req.params.id).lean();
  if (!subject) throw ApiError.notFound('Subject not found');
  return sendSuccess({ res, data: subject });
});

// ─────────────────────────── Topics ───────────────────────────

export const createTopic = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body as {
    name: string;
    slug?: string;
    subject: string;
    parentTopic?: string;
    description?: string;
    weight?: number;
  };
  const topic = await Topic.create({
    ...body,
    slug: body.slug || slugify(body.name),
    createdBy: req.principal!.userId,
  });
  return sendSuccess({ res, status: 201, data: topic });
});

export const listTopics = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const subject = req.query.subject as string | undefined;
  const q = subject ? { subject } : {};
  const items = await Topic.find(q).sort({ name: 1 }).lean();
  return sendSuccess({ res, data: items });
});

// ─────────────────────────── Questions ───────────────────────────

export const createQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const body = req.body;
  const question = await Question.create({
    ...body,
    createdBy: req.principal!.userId,
  });
  return sendSuccess({ res, status: 201, data: question });
});

export const listQuestions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { page, limit, search, subject, topic, type, difficulty, status, language, sort } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};
  if (subject) filter.subject = subject;
  if (topic) filter.topic = topic;
  if (type) filter.type = type;
  if (difficulty) filter.difficulty = difficulty;
  if (status) filter.status = status;
  if (language) filter.language = language;
  if (search) filter.$text = { $search: search };

  const pageNum = Number(page ?? 1);
  const limitNum = Number(limit ?? 20);
  const sortOpt: Record<string, 1 | -1> = sort ? parseSort(sort) : { createdAt: -1 };

  // Students only see approved questions
  if (req.principal?.role === 'student') filter.status = QuestionStatus.APPROVED;

  const [items, total] = await Promise.all([
    Question.find(filter)
      .populate('subject', 'name slug')
      .populate('topic', 'name slug')
      .sort(sortOpt)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    Question.countDocuments(filter),
  ]);

  return sendPaginated(res, { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
});

export const getQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const question = await Question.findById(req.params.id)
    .populate('subject', 'name slug')
    .populate('topic', 'name slug')
    .lean();
  if (!question) throw ApiError.notFound('Question not found');
  return sendSuccess({ res, data: question });
});

export const updateQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const question = await Question.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true },
  ).lean();
  if (!question) throw ApiError.notFound('Question not found');
  return sendSuccess({ res, data: question });
});

export const deleteQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await Question.deleteOne({ _id: req.params.id });
  if (result.deletedCount === 0) throw ApiError.notFound('Question not found');
  return sendSuccess({ res, data: { ok: true } });
});

export const reviewQuestion = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { action } = req.body as { action: 'approve' | 'reject' };
  const status = action === 'approve' ? QuestionStatus.APPROVED : QuestionStatus.REJECTED;
  const question = await Question.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status,
        reviewedBy: req.principal!.userId,
        reviewedAt: new Date(),
      },
    },
    { new: true },
  ).lean();
  if (!question) throw ApiError.notFound('Question not found');
  return sendSuccess({ res, data: question });
});

export const bulkUploadQuestions = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Expect a JSON array of questions (used by import tools)
  const list = req.body as Record<string, unknown>[];
  if (!Array.isArray(list) || list.length === 0) {
    throw ApiError.badRequest('Expected a JSON array of question objects');
  }
  const docs = list.map((q) => ({ ...q, createdBy: req.principal!.userId }));
  const inserted = await Question.insertMany(docs, { ordered: false });
  return sendSuccess({ res, status: 201, data: { insertedCount: inserted.length, ids: inserted.map((d) => d._id) } });
});

function parseSort(sort: string): Record<string, 1 | -1> {
  const out: Record<string, 1 | -1> = {};
  for (const part of sort.split(',')) {
    const dir = part.startsWith('-') ? -1 : 1;
    const field = part.replace(/^-/, '').trim();
    if (field) out[field] = dir;
  }
  return Object.keys(out).length ? out : { createdAt: -1 };
}
