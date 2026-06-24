import mongoose, { Schema, type InferSchemaType } from 'mongoose';

/**
 * Auto-incrementing counter collection used to mint human-readable
 * sequential IDs (question code TQA-00001, certificate IDs, etc.).
 */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CounterDocument = InferSchemaType<typeof counterSchema>;
export const Counter = mongoose.model<CounterDocument>('Counter', counterSchema);
