import type { Types } from 'mongoose';
import { Result, type ResultDocument } from '../models/Result.js';
import { TestAttempt } from '../models/TestAttempt.js';
import { Test } from '../models/Test.js';
import { ApiError } from '../utils/apiError.js';
import { Difficulty, QuestionType } from '../types/enums.js';

type LeanQuestion = {
  _id: Types.ObjectId;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  negativeMarks: number;
  options?: { key: string }[];
  correctAnswer?: string | string[];
  acceptableAnswers?: string[];
  numericalAnswer?: number;
  numericalTolerance?: number;
  matchPairs?: { left: string; right: string }[];
  subject?: Types.ObjectId;
  topic?: Types.ObjectId;
};

interface AnswerInput {
  questionId: string | Types.ObjectId;
  value?: unknown;
  timeSpentSeconds?: number;
}

interface DimensionAgg {
  key: string;
  label: string;
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
  marks: number;
  maxMarks: number;
}

class DimensionMap {
  private map = new Map<string, DimensionAgg>();
  ensure(key: string): DimensionAgg {
    let b = this.map.get(key);
    if (!b) {
      b = { key, label: key, correct: 0, incorrect: 0, unattempted: 0, total: 0, marks: 0, maxMarks: 0 };
      this.map.set(key, b);
    }
    return b;
  }
  toArray(): DimensionAgg[] {
    return [...this.map.values()];
  }
}

/**
 * Auto-grade an attempt against the question bank. Handles all objective
 * types. Subjective/coding/paragraph questions are skipped (need manual/AI review).
 */
export async function gradeAttempt(attemptId: Types.ObjectId | string): Promise<{
  result: ResultDocument;
}> {
  const attempt = await TestAttempt.findById(attemptId).lean();
  if (!attempt) throw ApiError.notFound('Attempt not found');

  const test = await Test.findById(attempt.test)
    .populate({ path: 'questions.question', select: '-explanation -explanationHindi' })
    .lean();
  if (!test) throw ApiError.notFound('Test not found');

  const questionDocs = (test.questions as unknown as Array<{ question: LeanQuestion }>)
    .map((q) => q.question)
    .filter(Boolean) as LeanQuestion[];

  const answers = (attempt.answers as AnswerInput[]) ?? [];
  const answerByQ = new Map<string, AnswerInput>();
  for (const a of answers) answerByQ.set(String(a.questionId), a);

  const subjectMap = new DimensionMap();
  const topicMap = new DimensionMap();
  const difficultyMap = new DimensionMap();

  let totalMarks = 0;
  let obtainedMarks = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;
  let attempted = 0;

  for (const q of questionDocs) {
    const a = answerByQ.get(String(q._id));
    totalMarks += q.marks;

    const subjectKey = q.subject ? String(q.subject) : 'general';
    const topicKey = q.topic ? String(q.topic) : 'unspecified';
    const diffKey = q.difficulty ?? Difficulty.MEDIUM;

    const buckets = [subjectMap.ensure(subjectKey), topicMap.ensure(topicKey), difficultyMap.ensure(diffKey)];
    for (const b of buckets) {
      b.total += 1;
      b.maxMarks += q.marks;
    }

    const isAttempted = a && a.value !== undefined && a.value !== null && a.value !== '';
    if (!isAttempted) {
      unattempted += 1;
      for (const b of buckets) b.unattempted += 1;
      continue;
    }
    attempted += 1;

    const ok = isCorrect(q, a!.value);
    if (ok) {
      correct += 1;
      obtainedMarks += q.marks;
      for (const b of buckets) {
        b.correct += 1;
        b.marks += q.marks;
      }
    } else {
      incorrect += 1;
      const neg = test.negativeMarkingEnabled ? q.negativeMarks ?? 0 : 0;
      obtainedMarks -= neg;
      for (const b of buckets) {
        b.incorrect += 1;
        b.marks -= neg;
      }
    }
  }

  const accuracy = attempted ? (correct / attempted) * 100 : 0;
  const percentage = totalMarks ? (obtainedMarks / totalMarks) * 100 : 0;
  const passPercent = totalMarks ? (test.passingMarks / totalMarks) * 100 : 0;
  const passed = percentage >= passPercent;

  const doc = await Result.findOneAndUpdate(
    { attempt: attemptId },
    {
      $set: {
        attempt: attemptId,
        test: attempt.test,
        user: attempt.user,
        score: round2(obtainedMarks),
        maxScore: round2(totalMarks),
        percentage: round2(percentage),
        passed,
        totalQuestions: questionDocs.length,
        attempted,
        correct,
        incorrect,
        unattempted,
        accuracy: round2(accuracy),
        timeTakenSeconds: attempt.timeSpentSeconds ?? 0,
        subjectWise: subjectMap.toArray(),
        topicWise: topicMap.toArray(),
        difficultyWise: difficultyMap.toArray(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await TestAttempt.updateOne(
    { _id: attemptId },
    { $set: { status: 'submitted', submittedAt: new Date() } },
  );

  return { result: doc };
}

// ── Per-type correctness ──
function isCorrect(q: LeanQuestion, value: unknown): boolean {
  switch (q.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.TRUE_FALSE:
    case QuestionType.ASSERTION_REASON:
      return typeof value === 'string' && value === q.correctAnswer;
    case QuestionType.MULTIPLE_CHOICE: {
      if (!Array.isArray(value) || !Array.isArray(q.correctAnswer)) return false;
      const a = [...value].sort();
      const b = [...q.correctAnswer].sort();
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    case QuestionType.FILL_IN_THE_BLANK: {
      const v = String(value ?? '').trim().toLowerCase();
      const ok = q.acceptableAnswers ?? (q.correctAnswer ? [String(q.correctAnswer)] : []);
      return ok.some((x) => String(x).trim().toLowerCase() === v);
    }
    case QuestionType.NUMERICAL: {
      const n = Number(value);
      if (!Number.isFinite(n) || typeof q.numericalAnswer !== 'number') return false;
      const tol = q.numericalTolerance ?? 0;
      return Math.abs(n - q.numericalAnswer) <= tol;
    }
    case QuestionType.MATCH_THE_FOLLOWING: {
      if (!Array.isArray(value) || !q.matchPairs) return false;
      const expected = q.matchPairs.map((p) => `${p.left}=${p.right}`);
      const got = (value as string[]).map((v) => String(v));
      return expected.length === got.length && expected.every((e) => got.includes(e));
    }
    case QuestionType.SUBJECTIVE:
    case QuestionType.CODING:
    case QuestionType.PARAGRAPH:
      return false; // not auto-graded
    default:
      return false;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
