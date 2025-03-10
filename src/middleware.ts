import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Handle admin routes separately
function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
}

// Check if the path is an auth route
function isAuthRoute(pathname: string) {
  return pathname.startsWith('/auth/');
}

export default authMiddleware({
  publicRoutes: [
    "/",
    "/gallery",
    "/contact",
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/error",
    "/api/webhook",
    "/admin/login",
    "/api/admin/auth",
    "/api/slots",
    "/api/slots/bulk",
    "/api/gallery",
  ],
  ignoredRoutes: [
    "/api/admin/auth",
    "/api/gallery",
    "/api/slots",
    "/api/slots/bulk",
    "/api/test-db",
    "/api/test-slots",
  ],
  afterAuth(auth, req) {
    // Get admin token from cookies
    const adminToken = req.cookies.get('admin_token');
    const path = req.nextUrl.pathname;
    
    // Check if trying to access admin routes
    if (isAdminRoute(path)) {
      if (!adminToken?.value) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
    }

    // Allow payment routes only for authenticated users
    if (path.startsWith('/api/payments/') && !auth.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Prevent authenticated users from accessing auth pages
    if (auth.userId && isAuthRoute(path)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Check if trying to access protected routes without authentication
    if (!auth.userId && !path.startsWith('/api/')) {
      const isPublicRoute = [
        "/",
        "/gallery",
        "/contact",
        "/auth/sign-in",
        "/auth/sign-up",
        "/auth/error",
        "/admin/login"
      ].includes(path);
      
      if (!isPublicRoute) {
        const signInUrl = new URL('/auth/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', path);
        return NextResponse.redirect(signInUrl);
      }
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