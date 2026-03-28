export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/tasks/:path*',
    '/daily/:path*',
    '/meetings/:path*',
    '/reports/:path*',
  ],
};