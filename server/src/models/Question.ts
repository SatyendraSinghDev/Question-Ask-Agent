import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import {
  Difficulty,
  Language,
  QuestionStatus,
  QuestionType,
} from '../types/enums.js';

/**
 * Flexible option pair: { key: 'A', text: '...', textHindi?: '...' }
 */
const optionSchema = new Schema(
  {
    key: { type: String, required: true },
    text: { type: String, required: true },
    textHindi: { type: String },
  },
  { _id: false },
);

const matchPairSchema = new Schema(
  {
    left: { type: String, required: true },
    right: { type: String, required: true },
    leftHindi: { type: String },
    rightHindi: { type: String },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    code: { type: String, unique: true, sparse: true, index: true }, // human-friendly id e.g. TQA-00001
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    topic: { type: Schema.Types.ObjectId, ref: 'Topic', index: true },
    type: {
      type: String,
      enum: Object.values(QuestionType),
      required: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: Object.values(Difficulty),
      default: Difficulty.MEDIUM,
      index: true,
    },
    language: {
      type: String,
      enum: Object.values(Language),
      default: Language.ENGLISH,
    },
    // ── Core bilingual content ──
    text: { type: String, required: true },
    textHindi: { type: String },
    passage: { type: String },            // for paragraph / assertion-reason
    passageHindi: { type: String },

    // ── Media attachments ──
    imageUrl: { type: String },
    audioUrl: { type: String },
    videoUrl: { type: String },

    // ── Answer payloads (type-dependent) ──
    options: { type: [optionSchema], default: undefined },
    correctAnswer: { type: Schema.Types.Mixed }, // string | string[]
    acceptableAnswers: { type: [String], default: undefined }, // fill-in-the-blank
    numericalAnswer: { type: Number },
    numericalTolerance: { type: Number, default: 0 },
    matchPairs: { type: [matchPairSchema], default: undefined },

    // ── Grading & meta ──
    explanation: { type: String },
    explanationHindi: { type: String },
    marks: { type: Number, required: true, default: 1, min: 0 },
    negativeMarks: { type: Number, default: 0, min: 0 },
    timeLimitSeconds: { type: Number, min: 0 },
    tags: { type: [String], default: [], index: true },

    status: {
      type: String,
      enum: Object.values(QuestionStatus),
      default: QuestionStatus.DRAFT,
    },

    // ── Provenance (AI / manual) ──
    source: {
      type: { type: String, enum: ['manual', 'ai'], default: 'manual' },
      generationLog: { type: Schema.Types.ObjectId, ref: 'AIQuestionGenerationLog' },
      originalityHash: { type: String }, // for duplicate detection
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

// Composite indexes for the common question-bank query: filter by subject+topic+diff+status
questionSchema.index({ subject: 1, topic: 1, difficulty: 1, status: 1 });
questionSchema.index({ type: 1, status: 1 });
questionSchema.index({
  text: 'text',
  textHindi: 'text',
  explanation: 'text',
  tags: 'text',
});

// Auto-assign a human-readable code on creation (TQA-00001, TQA-00002, …)
questionSchema.pre('validate', async function assignCode(next) {
  if (this.code) return next();
  try {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'question' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    this.code = `TQA-${String(counter.seq).padStart(5, '0')}`;
  } catch (err) {
    return next(err as Error);
  }
  next();
});

import { Counter } from './Counter.js';

export type QuestionDocument = InferSchemaType<typeof questionSchema>;
export const Question = mongoose.model<QuestionDocument>('Question', questionSchema);
