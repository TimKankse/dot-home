import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: string;
    sessionVersion: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    sessionVersion?: number;
    sessionInvalidated?: boolean;
  }
}
