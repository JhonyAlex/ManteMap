import { handlers } from '@/auth';

/**
 * NextAuth route handler.
 * Handles all /api/auth/* routes (signin, signout, session, csrf, etc.).
 */
export const { GET, POST } = handlers;
