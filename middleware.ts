import { withAuth } from 'next-auth/middleware';
import { authOptions } from './app/api/auth/[...nextauth]/route';

export default withAuth(
  // Custom middleware logic (optional)
  function middleware(req) {
    // All logic handled by withAuth
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/(authenticated)/:path*',
  ],
};

