import 'next-auth';
import 'next-auth/jwt';

/**
 * Extend NextAuth types with ManteMap's minimal session/JWT claims.
 * Only id, email, name, and global role are stored in the token.
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extend JWT with ManteMap's minimal claims.
   * Auth.js provides `sub` as the user identifier — no redundant `id` field.
   */
  interface JWT {
    email: string;
    name: string | null;
    role: string;
  }
}
