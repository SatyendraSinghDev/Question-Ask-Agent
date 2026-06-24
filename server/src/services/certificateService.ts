import { createHash } from 'node:crypto';
import type { Types } from 'mongoose';
import { Certificate } from '../models/Certificate.js';
import { Result } from '../models/Result.js';
import { Test } from '../models/Test.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { env } from '../config/env.js';
import { computeRank } from './rankingService.js';

/**
 * Issue a verifiable certificate for a passing result. Idempotent — re-issuing
 * returns the existing record instead of duplicating.
 */
export async function issueCertificate(resultId: Types.ObjectId | string) {
  const result = await Result.findById(resultId).lean();
  if (!result) throw ApiError.notFound('Result not found');
  if (!result.passed) throw ApiError.badRequest('Certificate requires a passing score');

  const existing = await Certificate.findOne({ result: resultId });
  if (existing) return existing;

  const [user, test] = await Promise.all([
    User.findById(result.user).select('_id name').lean().exec(),
    Test.findById(result.test).select('_id name').lean().exec(),
  ]);
  if (!user) throw ApiError.notFound('User not found');
  if (!test) throw ApiError.notFound('Test not found');

  const { rank } = await computeRank(resultId);
  const grade = gradeFor(result.percentage);
  const distinction = result.percentage >= 90;

  const certificate = await Certificate.create({
    user: user._id,
    test: test._id,
    result: result._id,
    candidateName: user.name,
    testName: test.name,
    score: result.score,
    maxScore: result.maxScore,
    percentage: result.percentage,
    rank,
    grade,
    distinction,
    verificationHash: makeHash(resultId, user._id),
  });

  await Result.updateOne({ _id: resultId }, { $set: { certificateIssued: true } });
  return certificate;
}

export async function verifyCertificate(certificateId: string) {
  const cert = await Certificate.findOne({ certificateId })
    .populate({ path: 'user', select: 'name email' })
    .populate({ path: 'test', select: 'name category' })
    .lean();
  if (!cert) throw ApiError.notFound('Certificate not found');
  if (cert.revokedAt) return { valid: false, reason: 'Certificate has been revoked', certificate: cert };
  return { valid: true, certificate: cert };
}

function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'D';
}

function makeHash(...parts: (Types.ObjectId | string)[]): string {
  return createHash('sha256')
    .update(parts.join('|'))
    .update(env.jwt.secret) // bind to server secret
    .digest('hex')
    .slice(0, 32);
}
