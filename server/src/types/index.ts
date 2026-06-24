/**
 * Shared TypeScript types & request/auth typings for TestASK AI.
 */
import type { Request } from 'express';
import type { Types } from 'mongoose';
import type {
  Difficulty,
  Language,
  QuestionStatus,
  QuestionType,
  TestStatus,
  TimerMode,
  UserRole,
  AttemptStatus,
} from './enums.js';

export interface IUserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  preferences?: {
    language: Language;
    theme: 'light' | 'dark';
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** The authenticated principal, attached by `authenticate` middleware. */
export interface AuthPrincipal {
  userId: string;
  role: UserRole;
  email: string;
  tokenId: string;
}

/** Augment Express Request with our principal. */
export interface AuthedRequest extends Request {
  principal?: AuthPrincipal;
  file?: Express.Multer.File;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

/** A single option of a choice question. */
export interface QuestionOption {
  key: string;            // "A" | "B" | ... or custom id
  text: string;           // English / primary text
  textHindi?: string;     // optional Hindi translation
}

/** Left↔Right pair for `match_the_following` questions. */
export interface MatchPair {
  left: string;
  right: string;
  leftHindi?: string;
  rightHindi?: string;
}

export interface QuestionFields {
  subject: Types.ObjectId | string;
  topic?: Types.ObjectId | string;
  type: QuestionType;
  difficulty: Difficulty;
  language: Language;
  /** Primary question text (English unless language is Hindi-only). */
  text: string;
  textHindi?: string;
  /** Rich media attachments. */
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  /** Choice / true-false / fill-blank payloads. */
  options?: QuestionOption[];
  /** Correct option key(s), or answer for fill-blank / numerical. */
  correctAnswer?: string | string[];
  /** Optional acceptable variants for fill-in-the-blank. */
  acceptableAnswers?: string[];
  /** Numerical answer + tolerance. */
  numericalAnswer?: number;
  numericalTolerance?: number;
  /** Match-the-following pairs. */
  matchPairs?: MatchPair[];
  /** Paragraph / assertion-reason shared context. */
  passage?: string;
  passageHindi?: string;
  explanation?: string;
  explanationHindi?: string;
  marks: number;
  negativeMarks?: number;
  timeLimitSeconds?: number;
  tags?: string[];
  status: QuestionStatus;
}

export interface TestConfig {
  name: string;
  description?: string;
  category?: string;
  subject?: Types.ObjectId | string;
  status: TestStatus;
  timerMode: TimerMode;
  durationSeconds?: number;        // when timerMode = TEST_LEVEL
  passingMarks: number;
  totalMarks: number;
  startAt?: Date;
  endAt?: Date;
  shuffleQuestions?: boolean;
  negativeMarkingEnabled?: boolean;
  proctoring?: {
    fullscreenRequired: boolean;
    tabSwitchDetection: boolean;
    cameraRequired: boolean;
  };
}

/** Generic API list query (paginated). */
export interface PaginatedQuery {
  page?: string;
  limit?: string;
  search?: string;
  sort?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AttemptState {
  answers: Record<string, unknown>;
  currentIndex: number;
  markedForReview: string[];
  visited: string[];
  timeSpentSeconds: number;
}

export type AttemptStatusValue = AttemptStatus;
