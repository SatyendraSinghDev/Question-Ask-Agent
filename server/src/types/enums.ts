/**
 * Shared enumerations for the TestASK AI platform.
 * These mirror the values used by both backend validation and frontend DTOs.
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

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  SUBMITTED = 'submitted',
  ABORTED = 'aborted',
}

export enum MediaType {
  IMAGE = 'image',
  PDF = 'pdf',
  TEXT = 'text',
}

export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export const ALL_QUESTION_TYPES = Object.values(QuestionType);
export const ALL_DIFFICULTIES = Object.values(Difficulty);
export const ALL_LANGUAGES = Object.values(Language);

/** Roles allowed to manage content (subjects, questions, tests). */
export const STAFF_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.EXAMINER];
/** Roles with platform-wide admin powers. */
export const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];
