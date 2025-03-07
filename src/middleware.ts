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
    "/api/payments/create-order"
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

    // Prevent authenticated users from accessing auth pages
    if (auth.userId && isAuthRoute(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Check if trying to access protected routes without authentication
    if (!auth.userId && !req.nextUrl.pathname.startsWith('/api/')) {
      const isPublicRoute = [
        "/",
        "/gallery",
        "/contact",
        "/auth/sign-in",
        "/auth/sign-up",
        "/auth/error",
        "/admin/login"
      ].includes(req.nextUrl.pathname);
      
      if (!isPublicRoute) {
        const signInUrl = new URL('/auth/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
      }
    }
  },
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}; 