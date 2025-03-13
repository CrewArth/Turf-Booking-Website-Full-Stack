import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Handle admin routes separately
function isAdminRoute(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login';
}

// Check if the path is an auth route
function isAuthRoute(pathname: string) {
  return pathname.startsWith('/auth/');
}

// Check if the path is a static asset or image
function isStaticAsset(pathname: string) {
  return pathname.includes('.') || 
         pathname.startsWith('/_next/') || 
         pathname === '/favicon.ico' ||
         pathname.startsWith('/__clerk');
}

// Check if the path is a public route
function isPublicRoute(pathname: string) {
  const publicPaths = [
    "/",
    "/gallery",
    "/contact",
    "/auth/sign-in",
    "/auth/sign-up",
    "/auth/error",
    "/admin/login",
  ];
  return publicPaths.some(path => pathname === path);
}

// Check if the path is a public API route
function isPublicApiRoute(pathname: string) {
  const publicApiPaths = [
    "/api/slots",
    "/api/gallery",
    "/api/admin/auth",
    "/api/admin/auth/check",
  ];
  return publicApiPaths.some(path => pathname.startsWith(path));
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
    "/api/admin/auth/check",
    "/api/slots",
    "/api/slots/bulk",
    "/api/gallery",
    "/api/test-db",
    "/api/test-slots",
  ],
  ignoredRoutes: [
    "/api/admin/auth",
    "/api/admin/auth/check",
    "/api/gallery",
    "/api/slots",
    "/api/slots/bulk",
    "/api/test-db",
    "/api/test-slots",
    "/_next",
    "/favicon.ico",
    "/api/clerk-webhook",
    "/__clerk",
  ],
  afterAuth(auth, req) {
    const url = new URL(req.url);
    const path = url.pathname;
    
    // Skip middleware for static assets and Clerk internal routes
    if (isStaticAsset(path)) {
      return NextResponse.next();
    }

    // Always allow public routes
    if (isPublicRoute(path) || isPublicApiRoute(path)) {
      return NextResponse.next();
    }

    // Get admin token from cookies
    const adminToken = req.cookies.get('admin_token');
    const isAdminPath = isAdminRoute(path);
    
    // Handle admin routes
    if (isAdminPath) {
      if (!adminToken?.value) {
        return NextResponse.redirect(new URL('/admin/login', req.url));
      }
      return NextResponse.next();
    }

    // Handle API routes
    if (path.startsWith('/api/')) {
      // Protect admin API routes
      if (path.startsWith('/api/admin/') && !adminToken?.value) {
        return NextResponse.json(
          { error: 'Admin authentication required' },
          { status: 401 }
        );
      }

      // Protect user-specific API routes
      if ((path.startsWith('/api/payments/') || path.startsWith('/api/bookings/')) && !auth.userId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      return NextResponse.next();
    }

    // Redirect if not authenticated
    if (!auth.userId && !isAdminPath && !path.startsWith('/auth/')) {
      const searchParams = new URLSearchParams({
        redirect_url: path,
      });
      return NextResponse.redirect(
        new URL(`/auth/sign-in?${searchParams}`, req.url)
      );
    }

    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/(api|trpc)(.*)",
  ],
}; 