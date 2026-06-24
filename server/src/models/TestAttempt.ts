import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { AttemptStatus } from '../types/enums.js';

/**
 * A concrete attempt of a Test by a student.
 * Stores per-question answers + proctoring logs so an attempt can be
 * paused/resumed and finally submitted.
 */

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    type: { type: String },                                 // question type snapshot
    value: { type: Schema.Types.Mixed },                    // selected option(s) / text / number
    visited: { type: Boolean, default: false },
    markedForReview: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['not_visited', 'not_answered', 'answered', 'marked', 'answered_marked'],
      default: 'not_visited',
    },
  },
  { _id: false },
);

const proctorEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['tab_switch', 'fullscreen_exit', 'copy', 'paste', 'window_blur', 'camera_block'],
    },
    at: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const attemptSchema = new Schema(
  {
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AttemptStatus),
      default: AttemptStatus.IN_PROGRESS,
      index: true,
    },
    answers: { type: [answerSchema], default: [] },
    markedForReview: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },
    visited: { type: [Schema.Types.ObjectId], ref: 'Question', default: [] },

    startedAt: { type: Date, default: Date.now, required: true },
    pausedAt: { type: Date },
    resumedAt: { type: Date },
    submittedAt: { type: Date },
    expiresAt: { type: Date },                  // hard auto-submit deadline (TTL index below)
    timeSpentSeconds: { type: Number, default: 0 },

    // ── Anti-cheat ──
    proctorEvents: { type: [proctorEventSchema], default: [], select: false },
    tabSwitchCount: { type: Number, default: 0 },
    fullscreenViolations: { type: Number, default: 0 },
    autoSubmitted: { type: Boolean, default: false },
    abortedReason: { type: String },

    // ── Snapshot of device ──
    device: {
      userAgent: { type: String },
      ip: { type: String },
    },
  },
  { timestamps: true },
);

attemptSchema.index({ test: 1, user: 1, status: 1 });
attemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AttemptDocument = InferSchemaType<typeof attemptSchema>;
export const TestAttempt = mongoose.model<AttemptDocument>('TestAttempt', attemptSchema);
