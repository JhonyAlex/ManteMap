import { z } from 'zod';

/**
 * Maximum password length in bytes for bcrypt compatibility.
 * bcrypt truncates input at 72 bytes; reject earlier for clear feedback.
 */
const BCRYPT_MAX_BYTES = 72;

/** Schema for user registration */
export const registerUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .preprocess(
      (val) => typeof val === 'string' ? val.trim().toLowerCase() : val,
      z.string().email('Invalid email address')
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters (bcrypt limit)')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .refine(
      (val) => Buffer.byteLength(val, 'utf8') <= BCRYPT_MAX_BYTES,
      'Password exceeds the maximum byte length allowed by the hashing algorithm'
    ),
});

/** Schema for login */
export const loginUserSchema = z.object({
  email: z
    .preprocess(
      (val) => typeof val === 'string' ? val.trim().toLowerCase() : val,
      z.string().email('Invalid email address')
    ),
  password: z.string().min(1, 'Password is required'),
});

/** Inferred type for registration */
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

/** Inferred type for login */
export type LoginUserInput = z.infer<typeof loginUserSchema>;
