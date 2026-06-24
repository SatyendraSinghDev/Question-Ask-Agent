import type { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthedRequest } from '../types/index.js';
import { Result } from '../models/Result.js';
import { Certificate } from '../models/Certificate.js';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { UserRole } from '../types/enums.js';

/** Student dashboard: tests attempted, averages, weak/strong topics, certs. */
export const studentDashboard = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.principal!.userId);

  const [results, certCount, trend] = await Promise.all([
    Result.find({ user: userId }).populate('test', 'name category').lean(),
    Certificate.countDocuments({ user: userId }),
    Result.aggregate([
      { $match: { user: userId } },
      { $sort: { createdAt: 1 } },
      { $project: { _id: 0, date: '$createdAt', percentage: 1, test: 1 } },
    ]),
  ]);

  const attempted = results.length;
  const avgScore = attempted ? results.reduce((s, r) => s + (r.percentage ?? 0), 0) / attempted : 0;
  const bestScore = attempted ? Math.max(...results.map((r) => r.percentage ?? 0)) : 0;

  // Weak/strong topics from aggregate accuracy across results
  const topicAgg = new Map<string, { correct: number; total: number }>();
  for (const r of results) {
    for (const t of r.topicWise ?? []) {
      const cur = topicAgg.get(t.key) ?? { correct: 0, total: 0 };
      cur.correct += t.correct;
      cur.total += t.total;
      topicAgg.set(t.key, cur);
    }
  }
  const topicAcc = [...topicAgg.entries()].map(([key, v]) => ({
    topic: key,
    accuracy: v.total ? (v.correct / v.total) * 100 : 0,
  }));
  const weakTopics = [...topicAcc].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const strongTopics = [...topicAcc].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);

  return sendSuccess({
    res,
    data: {
      attempts: attempted,
      averageScore: Math.round(avgScore * 100) / 100,
      bestScore: Math.round(bestScore * 100) / 100,
      certificates: certCount,
      weakTopics,
      strongTopics,
      trend,
    },
  });
});

/** Admin/Super dashboard: users, tests, AI generations, recent activity. */
export const adminDashboard = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const [totalUsers, students, staff, totalTests, totalQuestions, aiQuestions, activeTests, certs] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.STUDENT }),
      User.countDocuments({ role: { $in: [UserRole.ADMIN, UserRole.EXAMINER, UserRole.SUPER_ADMIN] } }),
      Test.countDocuments(),
      Question.countDocuments(),
      Question.countDocuments({ 'source.type': 'ai' }),
      Test.countDocuments({ status: 'live' }),
      Certificate.countDocuments(),
    ]);

  // Last 14 days new users (for trend chart)
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const dailyUsers = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  return sendSuccess({
    res,
    data: {
      users: { total: totalUsers, students, staff },
      tests: { total: totalTests, active: activeTests },
      questions: { total: totalQuestions, aiGenerated: aiQuestions },
      certificates: certs,
      dailyUsers,
    },
  });
});
