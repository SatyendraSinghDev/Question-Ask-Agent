import type { Response } from 'express';
import type { AuthedRequest } from '../types/index.js';
import { asyncHandler } from '../middleware/error.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import { Topic } from '../models/Topic.js';
import { Question } from '../models/Question.js';
import { Test } from '../models/Test.js';
import {
  Difficulty,
  Language,
  QuestionStatus,
  QuestionType,
  TestStatus,
  TimerMode,
  UserRole,
} from '../types/enums.js';

/**
 * Idempotent seed endpoint — safe to call multiple times (upserts).
 * Creates a Super Admin, sample subjects/topics, a small question bank,
 * and a published practice test.
 */
export const runSeed = asyncHandler(async (req: AuthedRequest, res: Response) => {
  // Only super_admin/admin may trigger a remote seed.
  if (req.principal!.role !== UserRole.SUPER_ADMIN && req.principal!.role !== UserRole.ADMIN) {
    throw ApiError.forbidden('Only admins can seed the database');
  }

  const result = await seedData();
  logger.info({ by: req.principal!.userId, ...result }, 'Remote seed completed');
  return sendSuccess({ res, data: result });
});

/** Run only when DB is empty (first boot) — called from server bootstrap. */
export async function seedIfEmpty(): Promise<void> {
  const count = await User.countDocuments().catch(() => 0);
  if (count > 0) return;
  logger.info('Database is empty — auto-seeding minimal data…');
  await seedData();
}

async function seedData() {
  const ADMIN = {
    name: 'Platform Admin',
    email: 'admin@testask.ai',
    password: 'Admin@123',
    role: UserRole.SUPER_ADMIN,
  };

  const admin =
    (await User.findOne({ email: ADMIN.email })) ??
    (await User.create({ ...ADMIN, isEmailVerified: true }));

  const SUBJECTS = [
    { name: 'Quantitative Aptitude', slug: 'quant', category: 'competitive', icon: '🔢', color: '#6366F1' },
    { name: 'General Knowledge', slug: 'gk', category: 'competitive', icon: '🌐', color: '#06B6D4' },
    { name: 'Reasoning', slug: 'reasoning', category: 'competitive', icon: '🧩', color: '#8B5CF6' },
    { name: 'English Language', slug: 'english', category: 'competitive', icon: '📚', color: '#F59E0B' },
  ] as const;

  const subjectDocs = [];
  for (const s of SUBJECTS) {
    const subject = await Subject.findOneAndUpdate(
      { slug: s.slug },
      { $set: { ...s, createdBy: admin._id, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    subjectDocs.push(subject);
    await Topic.findOneAndUpdate(
      { subject: subject._id, slug: 'general' },
      { $set: { name: 'General', subject: subject._id, slug: 'general', createdBy: admin._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  const quant = subjectDocs.find((s) => s!.slug === 'quant')!;
  const sampleQs = [
    {
      subject: quant!._id,
      type: QuestionType.SINGLE_CHOICE,
      difficulty: Difficulty.EASY,
      language: Language.ENGLISH,
      text: 'What is 15% of 240?',
      textHindi: '240 का 15% क्या है?',
      options: [
        { key: 'A', text: '32', textHindi: '32' },
        { key: 'B', text: '36', textHindi: '36' },
        { key: 'C', text: '40', textHindi: '40' },
        { key: 'D', text: '48', textHindi: '48' },
      ],
      correctAnswer: 'B',
      explanation: '15% of 240 = 0.15 × 240 = 36.',
      marks: 1,
      negativeMarks: 0.25,
      status: QuestionStatus.APPROVED,
    },
    {
      subject: quant!._id,
      type: QuestionType.NUMERICAL,
      difficulty: Difficulty.MEDIUM,
      language: Language.ENGLISH,
      text: 'A train travels 360 km in 4 hours. Its average speed (in km/h) is?',
      numericalAnswer: 90,
      numericalTolerance: 0,
      explanation: 'Speed = 360 / 4 = 90 km/h.',
      marks: 2,
      status: QuestionStatus.APPROVED,
    },
  ];

  const created = await Question.insertMany(
    sampleQs.map((q) => ({ ...q, createdBy: admin._id })),
    { ordered: false },
  ).catch(() => []);

  if (created.length > 0) {
    await Test.findOneAndUpdate(
      { slug: 'sample-practice-test' },
      {
        $set: {
          name: 'Sample Practice Test',
          slug: 'sample-practice-test',
          description: 'A short sample test so you can try the engine end-to-end.',
          category: 'practice',
          examType: 'practice',
          status: TestStatus.LIVE,
          timerMode: TimerMode.TEST_LEVEL,
          durationSeconds: 10 * 60,
          passingMarks: 1,
          totalMarks: created.reduce((s, q) => s + (q.marks ?? 1), 0),
          questions: created.map((q) => ({ question: q._id })),
          shuffleQuestions: false,
          showSolutionsAfter: true,
          maxAttempts: 3,
          createdBy: admin._id,
          publishedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }

  return {
    adminId: String(admin._id),
    adminEmail: admin.email,
    subjects: subjectDocs.length,
    questions: created.length,
    test: created.length > 0 ? 'created' : 'skipped',
  };
}
