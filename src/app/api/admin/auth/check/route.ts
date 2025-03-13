import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const adminToken = cookieStore.get('admin_token');
    const adminEmail = cookieStore.get('admin_email');

    // Check both token and email
    if (!adminToken?.value || !adminEmail?.value) {
      return NextResponse.json({
        isAdmin: false,
        message: 'Admin authentication required'
      }, { status: 401 });
    }

    // Verify against environment variable
    const validAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail.value !== validAdminEmail) {
      return NextResponse.json({
        isAdmin: false,
        message: 'Invalid admin credentials'
      }, { status: 401 });
    }

    return NextResponse.json({
      isAdmin: true
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({
      isAdmin: false,
      message: 'Error checking admin status'
    }, { status: 500 });
  }
} 