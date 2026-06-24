import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const topicSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    subject: { type: Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    parentTopic: { type: Schema.Types.ObjectId, ref: 'Topic' }, // for topic hierarchies
    description: { type: String, default: '' },
    weight: { type: Number, default: 1 }, // exam priority weighting
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

topicSchema.index({ subject: 1, slug: 1 }, { unique: true });
topicSchema.index({ name: 'text' });

export type TopicDocument = InferSchemaType<typeof topicSchema>;
export const Topic = mongoose.model<TopicDocument>('Topic', topicSchema);
