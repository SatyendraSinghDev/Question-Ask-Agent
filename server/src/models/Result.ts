import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Final graded outcome of a TestAttempt.
 * Denormalised for fast dashboard queries — written once on submit.
 */

const sectionBreakdownSchema = new Schema(
  {
    title: { type: String },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    totalQuestions: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
  },
  { _id: false },
);

const dimensionBreakdownSchema = new Schema(
  {
    key: { type: String, required: true },         // subject/topic/difficulty bucket name
    label: { type: String },
    total: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    marks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
  },
  { _id: false },
);

const resultSchema = new Schema(
  {
    attempt: {
      type: Schema.Types.ObjectId,
      ref: 'TestAttempt',
      required: true,
      unique: true,
      index: true,
    },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    score: { type: Number, required: true, default: 0 },
    maxScore: { type: Number, required: true, default: 0 },
    percentage: { type: Number, required: true, default: 0 },
    passed: { type: Boolean, required: true, default: false },

    totalQuestions: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 },
    correct: { type: Number, default: 0 },
    incorrect: { type: Number, default: 0 },
    unattempted: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },        // correct / attempted

    timeTakenSeconds: { type: Number, default: 0 },

    rank: { type: Number },                          // computed among test takers
    totalParticipants: { type: Number },

    sections: { type: [sectionBreakdownSchema], default: [] },
    subjectWise: { type: [dimensionBreakdownSchema], default: [] },
    topicWise: { type: [dimensionBreakdownSchema], default: [] },
    difficultyWise: { type: [dimensionBreakdownSchema], default: [] },

    // ── AI insights (optional, populated by AI evaluation service) ──
    weakTopics: { type: [String], default: [] },
    strongTopics: { type: [String], default: [] },
    studySuggestions: { type: [String], default: [] },

    certificateIssued: { type: Boolean, default: false },
  },
  { timestamps: true },
);

resultSchema.index({ test: 1, percentage: -1 });   // for ranking
resultSchema.index({ user: 1, createdAt: -1 });     // student dashboard trend

export type ResultDocument = InferSchemaType<typeof resultSchema>;
export const Result = mongoose.model<ResultDocument>('Result', resultSchema);
