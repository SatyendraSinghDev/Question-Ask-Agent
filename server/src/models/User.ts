import mongoose, { Schema, type Model, type InferSchemaType, type HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import { Language, UserRole } from '../types/enums.js';

const SALT_ROUNDS = 12;

const refreshTokenSchema = new Schema(
  {
    tokenId: { type: String, required: true },
    exp: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
      index: true,
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    avatarUrl: { type: String },
    phone: { type: String, trim: true },
    preferences: {
      language: { type: String, enum: Object.values(Language), default: Language.BILINGUAL },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    },
    // ── Security tokens (verification / password reset) ──
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    // ── Refresh-token allowlist (tokenId → exp) ──
    refreshTokens: { type: [refreshTokenSchema], select: false, default: [] },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });

// Hash password on save when modified.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  if (!this.isNew && this.isModified('password')) {
    this.passwordChangedAt = new Date();
  }
  next();
});

interface UserInstanceMethods {
  comparePassword(candidate: string): Promise<boolean>;
  registerRefreshToken(tokenId: string, exp: Date): void;
  revokeRefreshToken(tokenId: string): void;
  isRefreshTokenValid(tokenId: string): boolean;
}

userSchema.method('comparePassword', function comparePassword(this: UserDoc, candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
});

userSchema.method('registerRefreshToken', function registerRefreshToken(this: UserDoc, tokenId: string, exp: Date) {
  this.refreshTokens.push({ tokenId, exp, createdAt: new Date() } as never);
});

userSchema.method('revokeRefreshToken', function revokeRefreshToken(this: UserDoc, tokenId: string) {
  this.refreshTokens = this.refreshTokens.filter((t) => t.tokenId !== tokenId) as never;
});

userSchema.method('isRefreshTokenValid', function isRefreshTokenValid(this: UserDoc, tokenId: string): boolean {
  const found = this.refreshTokens.find((t) => t.tokenId === tokenId);
  return !!found && (!found.exp || found.exp.getTime() > Date.now());
});

// Hide sensitive fields from JSON responses.
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.emailVerificationExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.refreshTokens;
    return ret;
  },
});

export type UserSchemaType = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserSchemaType, UserInstanceMethods>;
export type UserModel = Model<UserSchemaType, Record<string, never>, UserInstanceMethods>;

export const User = mongoose.model<UserDoc, UserModel>('User', userSchema);

export const DEFAULT_ADMIN_EMAIL = 'admin@testask.ai';
