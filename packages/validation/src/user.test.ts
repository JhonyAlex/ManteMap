import { describe, it, expect } from 'vitest';
import { registerUserSchema, loginUserSchema } from './user';

describe('registerUserSchema', () => {
  // --- Email normalization ---
  it('accepts a valid normalized email', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongP4ss!',
    });
    expect(result.success).toBe(true);
  });

  it('normalizes email to lowercase and trims whitespace', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: '  JOHN@EXAMPLE.COM  ',
      password: 'StrongP4ss!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('john@example.com');
    }
  });

  it('rejects an invalid email format', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'not-an-email',
      password: 'StrongP4ss!',
    });
    expect(result.success).toBe(false);
  });

  // --- Password validation ---
  it('accepts a password with 8 characters meeting complexity', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Abcdef1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Ab1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password exceeding 72 bytes (bcrypt limit)', () => {
    // 73 characters — all above bcrypt's 72-byte truncation boundary
    const longPassword = 'A'.repeat(70) + '1a!';
    expect(longPassword.length).toBe(73);
    expect(Buffer.byteLength(longPassword, 'utf8')).toBeGreaterThan(72);
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: longPassword,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a password exactly at the 72-byte boundary', () => {
    // 72 characters exactly
    const boundaryPassword = 'A'.repeat(69) + '1a!';
    expect(boundaryPassword.length).toBe(72);
    expect(Buffer.byteLength(boundaryPassword, 'utf8')).toBe(72);
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: boundaryPassword,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a password without uppercase', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'abcdef1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password without lowercase', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'ABCDEF1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a password without a number', () => {
    const result = registerUserSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Abcdefgh!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = registerUserSchema.safeParse({
      email: 'john@example.com',
      password: 'StrongP4ss!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    const result = registerUserSchema.safeParse({
      name: 'J',
      email: 'john@example.com',
      password: 'StrongP4ss!',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginUserSchema', () => {
  it('accepts valid login credentials', () => {
    const result = loginUserSchema.safeParse({
      email: 'john@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects login with empty password', () => {
    const result = loginUserSchema.safeParse({
      email: 'john@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects login with invalid email', () => {
    const result = loginUserSchema.safeParse({
      email: 'bad-email',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
  });
});
