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
  return pathname.includes('.') || pathname.startsWith('/_next/') || pathname === '/favicon.ico';
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
  ],
  afterAuth(auth, req) {
    const path = req.nextUrl.pathname;
    
    // Skip middleware for static assets
    if (isStaticAsset(path)) {
      return NextResponse.next();
    }

    // Get admin token from cookies
    const adminToken = req.cookies.get('admin_token');
    const isAdminPath = isAdminRoute(path);
    
    // Handle admin routes
    if (isAdminPath) {
      if (!adminToken?.value) {
        // Redirect to admin login with return URL
        const loginUrl = new URL('/admin/login', req.url);
        loginUrl.searchParams.set('redirect_url', path);
        return NextResponse.redirect(loginUrl);
      }
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

    // Prevent authenticated users from accessing auth pages
    if (auth.userId && isAuthRoute(path)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Handle protected routes
    if (!auth.userId && !isAdminPath) {
      const isPublicRoute = [
        "/",
        "/gallery",
        "/contact",
        "/auth/sign-in",
        "/auth/sign-up",
        "/auth/error",
        "/admin/login",
      ].includes(path);

      if (!isPublicRoute) {
        const signInUrl = new URL('/auth/sign-in', req.url);
        signInUrl.searchParams.set('redirect_url', path);
        return NextResponse.redirect(signInUrl);
      }
    }

    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}; 