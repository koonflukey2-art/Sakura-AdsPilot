export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/dashboard/:path*', '/rules/:path*', '/logs/:path*', '/settings/:path*']
};
