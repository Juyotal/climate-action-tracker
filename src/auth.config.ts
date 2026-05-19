import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Node.js-only imports).
 * Used by middleware. The full auth config (with Credentials provider + bcrypt) is in src/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [],
};
