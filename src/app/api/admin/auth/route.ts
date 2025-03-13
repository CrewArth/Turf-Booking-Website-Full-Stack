import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Email and password are required'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validate admin credentials are configured
    if (!adminEmail || !adminPassword) {
      console.error('Admin credentials not configured');
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Admin authentication not configured'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Check credentials
    if (email !== adminEmail || password !== adminPassword) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: 'Invalid credentials'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Create response with cookies
    const response = new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Authentication successful'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    // Set cookies on the response
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      // Set expiry to 24 hours
      maxAge: 60 * 60 * 24,
    };

    response.cookies.set('admin_token', 'true', cookieOptions);
    response.cookies.set('admin_email', email, cookieOptions);

    return response;
  } catch (error) {
    console.error('Admin authentication error:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Authentication failed'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

export async function DELETE() {
  try {
    const response = new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Logged out successfully'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    // Clear cookies with same options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0, // Expire immediately
    };

    response.cookies.set('admin_token', '', cookieOptions);
    response.cookies.set('admin_email', '', cookieOptions);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        message: 'Failed to logout'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 