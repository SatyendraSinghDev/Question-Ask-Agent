import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import {
  Difficulty,
  GenerationStatus,
  Language,
  MediaType,
} from '../types/enums.js';

/**
 * Audit record for every AI question-generation request — text, image (OCR),
 * or PDF. Stores the prompt, model, cost-ish metadata, and the generated
 * questions for review/rollback.
 */

const generatedQuestionSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question' },
    raw: { type: Schema.Types.Mixed },                // raw model output for this Q
    accepted: { type: Boolean, default: false },
  },
  { _id: false },
);

const generationLogSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inputType: {
      type: String,
      enum: Object.values(MediaType),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(GenerationStatus),
      default: GenerationStatus.PENDING,
      index: true,
    },

    // ── Inputs ──
    topic: { type: String },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    difficulty: { type: String, enum: Object.values(Difficulty), default: Difficulty.MEDIUM },
    language: { type: String, enum: Object.values(Language), default: Language.ENGLISH },
    count: { type: Number, default: 5 },
    prompt: { type: String },                          // final prompt sent to model
    fileUrl: { type: String },                         // uploaded image/pdf path
    fileMime: { type: String },
    extractedText: { type: String, select: false },    // OCR / PDF extraction

    // ── Model call ──
    model: { type: String },
    promptTokens: { type: Number },
    completionTokens: { type: Number },
    latencyMs: { type: Number },
    error: { type: String },

    generatedQuestions: { type: [generatedQuestionSchema], default: [], select: false },
    savedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

generationLogSchema.index({ requestedBy: 1, createdAt: -1 });
generationLogSchema.index({ status: 1 });

export type GenerationLogDocument = InferSchemaType<typeof generationLogSchema>;
export const AIQuestionGenerationLog = mongoose.model<GenerationLogDocument>(
  'AIQuestionGenerationLog',
  generationLogSchema,
);
