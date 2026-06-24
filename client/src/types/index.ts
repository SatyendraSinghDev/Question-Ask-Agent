/**
 * Frontend DTOs + enums — mirror the backend types/enums.
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EXAMINER = 'examiner',
  STUDENT = 'student',
}

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  FILL_IN_THE_BLANK = 'fill_in_the_blank',
  NUMERICAL = 'numerical',
  MATCH_THE_FOLLOWING = 'match_the_following',
  ASSERTION_REASON = 'assertion_reason',
  PARAGRAPH = 'paragraph',
  CODING = 'coding',
  SUBJECTIVE = 'subjective',
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum Language {
  ENGLISH = 'english',
  HINDI = 'hindi',
  BILINGUAL = 'bilingual',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived',
}

export enum TestStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum TimerMode {
  NONE = 'none',
  TEST_LEVEL = 'test_level',
  QUESTION_LEVEL = 'question_level',
}

export type ID = string;

export interface User {
  id?: ID;
  _id?: ID;
  name: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  avatarUrl?: string;
  phone?: string;
  createdAt?: string;
}

export interface Subject {
  _id: ID;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  category?: string;
}

export interface Topic {
  _id: ID;
  name: string;
  slug: string;
  subject: ID;
}

export interface QuestionOption {
  key: string;
  text: string;
  textHindi?: string;
}

export interface Question {
  _id: ID;
  code?: string;
  subject: ID | Subject;
  topic?: ID | Topic;
  type: QuestionType;
  difficulty: Difficulty;
  language: Language;
  text: string;
  textHindi?: string;
  options?: QuestionOption[];
  correctAnswer?: string | string[];
  acceptableAnswers?: string[];
  numericalAnswer?: number;
  numericalTolerance?: number;
  explanation?: string;
  explanationHindi?: string;
  marks: number;
  negativeMarks?: number;
  timeLimitSeconds?: number;
  tags?: string[];
  status: QuestionStatus;
  source?: { type: 'manual' | 'ai' };
  createdAt?: string;
}

export interface TestQuestionRef {
  question: ID | Question;
  marksOverride?: number;
  timeLimitSeconds?: number;
}

export interface Test {
  _id: ID;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  examType?: string;
  status: TestStatus;
  questions: TestQuestionRef[];
  totalMarks: number;
  passingMarks: number;
  timerMode: TimerMode;
  durationSeconds?: number;
  startAt?: string;
  endAt?: string;
  proctoring?: {
    fullscreenRequired: boolean;
    tabSwitchDetection: boolean;
    cameraRequired: boolean;
    maxTabSwitches: number;
  };
}

export interface AttemptAnswer {
  questionId: ID;
  value?: unknown;
  status?: 'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';
  timeSpentSeconds?: number;
  markedForReview?: boolean;
}

export interface Attempt {
  _id: ID;
  test: ID;
  user: ID;
  status: 'in_progress' | 'paused' | 'submitted' | 'aborted';
  answers: AttemptAnswer[];
  startedAt: string;
  expiresAt?: string;
  timeSpentSeconds?: number;
  tabSwitchCount?: number;
  fullscreenViolations?: number;
}

export interface ResultBreakdown {
  key: string;
  label?: string;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  marks: number;
  maxMarks: number;
}

export interface Result {
  _id: ID;
  attempt: ID;
  test: ID | Test;
  user: ID;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  accuracy: number;
  timeTakenSeconds: number;
  rank?: number;
  totalParticipants?: number;
  subjectWise?: ResultBreakdown[];
  topicWise?: ResultBreakdown[];
  difficultyWise?: ResultBreakdown[];
  weakTopics?: string[];
  strongTopics?: string[];
  certificateIssued?: boolean;
  createdAt?: string;
}

export interface Certificate {
  _id: ID;
  certificateId: string;
  user: ID;
  test: ID | Test;
  result: ID;
  candidateName: string;
  testName: string;
  score: number;
  maxScore: number;
  percentage: number;
  rank?: number;
  grade?: string;
  distinction?: boolean;
  issuedAt: string;
  verificationHash: string;
}

export interface AuthResponse {
  user: User;
  tokens: { accessToken: string; refreshToken: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Shape returned by the API envelope: { success, data, meta? } */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { pagination?: { total: number; page: number; limit: number; pages: number } };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
