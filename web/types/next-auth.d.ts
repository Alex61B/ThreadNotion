import NextAuth from 'next-auth';

declare module 'next-auth' {
  type AccountRole = 'MANAGER' | 'SALES_REP';

  interface Session {
    user?: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: AccountRole;
    };
  }
}

