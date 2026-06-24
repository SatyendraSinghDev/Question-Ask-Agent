import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const subjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, lowercase: true, unique: true },
    description: { type: String, default: '' },
    icon: { type: String, default: '📘' },
    color: { type: String, default: '#6366F1' },
    category: {
      type: String,
      enum: ['academic', 'competitive', 'banking', 'engineering', 'medical', 'general'],
      default: 'academic',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

subjectSchema.index({ name: 'text', description: 'text' });

export type SubjectDocument = InferSchemaType<typeof subjectSchema>;
export const Subject = mongoose.model<SubjectDocument>('Subject', subjectSchema);
