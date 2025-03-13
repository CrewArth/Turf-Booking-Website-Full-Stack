import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    // Get admin credentials from environment variables
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validate admin credentials are configured
    if (!adminEmail || !adminPassword) {
      console.error('Admin credentials not configured');
      return NextResponse.json({
        success: false,
        message: 'Admin authentication not configured'
      }, { status: 500 });
    }

    // Check credentials
    if (email !== adminEmail || password !== adminPassword) {
      return NextResponse.json({
        success: false,
        message: 'Invalid credentials'
      }, { status: 401 });
    }

    // Set secure cookies
    const cookieStore = cookies();
    
    // Set admin token cookie (HTTP only for security)
    cookieStore.set('admin_token', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Set admin email cookie
    cookieStore.set('admin_email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json({
      success: false,
      message: 'Authentication failed'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    
    // Clear admin cookies
    cookieStore.delete('admin_token');
    cookieStore.delete('admin_email');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to logout'
    }, { status: 500 });
  }
} 