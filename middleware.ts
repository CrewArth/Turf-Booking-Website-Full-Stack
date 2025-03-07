import { authMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Handle admin routes separately
function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
}

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware

export default authMiddleware({
  publicRoutes: [
    "/",
    "/gallery",
    "/contact",
    "/auth/sign-in(.*)",
    "/auth/sign-up(.*)",
    "/api/webhook",
    "/admin/login",
    "/api/admin/auth",
    "/api/slots",
    "/api/slots/bulk",
    "/api/gallery",
    "/api/payments/create-order",
  ],
  ignoredRoutes: [
    "/api/admin/auth",
    "/api/gallery",
    "/api/slots",
    "/api/slots/bulk",
    "/api/payments/create-order"
  ],
  afterAuth(auth, req) {
    // Get admin token from cookies
    const adminToken = req.cookies.get('admin_token');
    
    // Check if trying to access admin routes
    if (isAdminRoute(req.nextUrl.pathname)) {
      if (!adminToken?.value) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }

    // Check if trying to access protected routes without authentication
    if (!auth.userId && !req.nextUrl.pathname.startsWith('/api/')) {
      const signInUrl = new URL('/auth/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  },
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
}; 