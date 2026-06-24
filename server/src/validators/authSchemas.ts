import { z } from 'zod';
import { UserRole } from '../types/enums.js';

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number');

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: passwordRule,
    role: z.nativeEnum(UserRole).default(UserRole.STUDENT),
    phone: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: passwordRule,
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().trim().email().toLowerCase(),
  }),
});
