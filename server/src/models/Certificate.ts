import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Verifiable completion certificate. QR-encoded verification URL embeds
 * the unique certificateId so anyone can validate authenticity.
 */

const certificateSchema = new Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => `TQA-CERT-${uuidv4().split('-')[0].toUpperCase()}`,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    test: { type: Schema.Types.ObjectId, ref: 'Test', required: true },
    result: { type: Schema.Types.ObjectId, ref: 'Result', required: true },

    candidateName: { type: String, required: true },
    testName: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    rank: { type: Number },
    grade: { type: String },                        // A+, A, B, …
    distinction: { type: Boolean, default: false },

    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    verificationHash: { type: String, required: true },  // sha256(certId|userId|resultId|secret)
    revokedAt: { type: Date },
    revokeReason: { type: String },

    template: { type: String, default: 'default' },
  },
  { timestamps: true },
);

certificateSchema.index({ user: 1, issuedAt: -1 });

export type CertificateDocument = InferSchemaType<typeof certificateSchema>;
export const Certificate = mongoose.model<CertificateDocument>('Certificate', certificateSchema);
