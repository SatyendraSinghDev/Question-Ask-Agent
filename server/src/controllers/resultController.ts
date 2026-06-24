import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { Result } from '../models/Result.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { issueCertificate, verifyCertificate } from '../services/certificateService.js';
import { Certificate } from '../models/Certificate.js';
import { UserRole } from '../types/enums.js';

export const getResult = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const result = await Result.findById(req.params.id)
    .populate({ path: 'test', select: 'name category totalMarks passingMarks' })
    .lean();
  if (!result) throw ApiError.notFound('Result not found');
  if (req.principal!.role === UserRole.STUDENT && String(result.user) !== req.principal!.userId) {
    throw ApiError.forbidden('This result does not belong to you');
  }
  return sendSuccess({ res, data: result });
});

export const getMyResults = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  const filter = { user: req.principal!.userId };
  const [items, total] = await Promise.all([
    Result.find(filter)
      .populate({ path: 'test', select: 'name category' })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Result.countDocuments(filter),
  ]);
  return sendPaginated(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
});

export const getTestLeaderboard = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { testId } = req.params as { testId: string };
  const limit = Math.min(Number(req.query.limit ?? 50), 100);
  const items = await Result.find({ test: testId })
    .sort({ percentage: -1, timeTakenSeconds: 1 })
    .limit(limit)
    .populate({ path: 'user', select: 'name' })
    .lean();
  return sendSuccess({ res, data: items });
});

// ── Certificates ──

export const issueCert = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { resultId } = req.params as { resultId: string };
  const result = await Result.findById(resultId).lean();
  if (!result) throw ApiError.notFound('Result not found');
  // Students may only issue their own; staff may issue any.
  if (req.principal!.role === UserRole.STUDENT && String(result.user) !== req.principal!.userId) {
    throw ApiError.forbidden();
  }
  const cert = await issueCertificate(resultId);
  return sendSuccess({ res, data: cert });
});

export const getMyCertificates = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const items = await Certificate.find({ user: req.principal!.userId })
    .populate({ path: 'test', select: 'name category' })
    .sort({ issuedAt: -1 })
    .lean();
  return sendSuccess({ res, data: items });
});

export const verifyCert = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { certificateId } = req.params as { certificateId: string };
  const data = await verifyCertificate(certificateId);
  return sendSuccess({ res, data });
});
