import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { TestStatus, TimerMode } from '../types/enums.js';

/**
 * A Test (exam) is a reusable blueprint: config + a set of questions.
 * A TestAttempt is a student's concrete run of a Test.
 */

const testQuestionSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    /** Optional per-question override of marks/time (only when allowed). */
    marksOverride: { type: Number },
    timeLimitSeconds: { type: Number },
  },
  { _id: false },
);

const proctoringSchema = new Schema(
  {
    fullscreenRequired: { type: Boolean, default: true },
    tabSwitchDetection: { type: Boolean, default: true },
    cameraRequired: { type: Boolean, default: false },
    maxTabSwitches: { type: Number, default: 3 },
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    title: { type: String, required: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    description: { type: String, default: '' },
    questions: { type: [testQuestionSchema], default: [] },
    marksPerQuestion: { type: Number, default: 1 },
    negativeMarksPerQuestion: { type: Number, default: 0 },
  },
  { _id: false },
);

const testSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, lowercase: true, unique: true },
    description: { type: String, default: '' },
    category: {
      type: String,
      enum: ['gate', 'upsc', 'ssc', 'banking', 'cat', 'neet', 'jee', 'government', 'practice', 'mock', 'custom'],
      default: 'custom',
      index: true,
    },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    examType: {
      type: String,
      enum: ['mock', 'practice', 'live', 'timed', 'subjective'],
      default: 'practice',
    },
    status: {
      type: String,
      enum: Object.values(TestStatus),
      default: TestStatus.DRAFT,
      index: true,
    },
    sections: { type: [sectionSchema], default: [] },
    questions: { type: [testQuestionSchema], default: [] },
    totalMarks: { type: Number, required: true, default: 0 },
    passingMarks: { type: Number, required: true, default: 0 },

    // ── Timer / window ──
    timerMode: {
      type: String,
      enum: Object.values(TimerMode),
      default: TimerMode.TEST_LEVEL,
    },
    durationSeconds: { type: Number },            // test-level timer
    startAt: { type: Date, index: true },
    endAt: { type: Date, index: true },
    windowMode: {
      type: String,
      enum: ['open', 'scheduled', 'fixed'],
      default: 'open',
    },

    // ── Rules ──
    shuffleQuestions: { type: Boolean, default: false },
    shuffleOptions: { type: Boolean, default: false },
    negativeMarkingEnabled: { type: Boolean, default: true },
    showSolutionsAfter: { type: Boolean, default: true },
    maxAttempts: { type: Number, default: 1 },
    proctoring: { type: proctoringSchema, default: () => ({}) },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    publishedAt: { type: Date },
  },
  { timestamps: true },
);

testSchema.index({ status: 1, startAt: 1, endAt: 1 });
testSchema.index({ name: 'text', description: 'text' });

export type TestDocument = InferSchemaType<typeof testSchema>;
export const Test = mongoose.model<TestDocument>('Test', testSchema);
