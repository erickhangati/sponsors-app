import NextAuth, { NextAuthOptions, Session as NextAuthSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

interface CustomSession extends NextAuthSession {
  accessToken?: string;
}

interface CustomJWT extends JWT {
  accessToken?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(credentials).toString(), // Ensure proper encoding
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Invalid username or password');
        }

        const user = await res.json();

        if (!user || !user.access_token) {
          throw new Error('Invalid response from backend');
        }

        return {
          id: user.id.toString(), // Ensure it's a string for NextAuth
          name: user.username,
          role: user.role,
          accessToken: user.access_token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: CustomJWT; user?: any }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role; // ✅ Store role in JWT
      }
      return token;
    },
    async session({ session, token }: { session: CustomSession; token: CustomJWT }) {
      session.accessToken = token.accessToken;
      session.user.role = token.role as 'admin' | 'sponsor' | 'user'; // ✅ Assign role to session
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
