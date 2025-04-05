import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'admin' | 'sponsor' | 'user'; // ✅ Define role here
    };
  }

  interface User {
    id: string;
    role: 'admin' | 'sponsor' | 'user'; // ✅ Add role to User type
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: 'admin' | 'sponsor' | 'user'; // ✅ Add role to JWT for persistence
  }
}
