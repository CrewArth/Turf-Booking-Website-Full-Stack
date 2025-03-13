import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const adminToken = cookieStore.get('admin_token');
    const adminEmail = cookieStore.get('admin_email');

    // Check both token and email
    if (!adminToken?.value || !adminEmail?.value) {
      // Clear invalid cookies in the response
      const response = new NextResponse(
        JSON.stringify({
          isAdmin: false,
          message: 'Admin authentication required'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_email');
      return response;
    }

    // Verify against environment variable
    const validAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (!validAdminEmail || adminEmail.value !== validAdminEmail) {
      // Clear invalid cookies in the response
      const response = new NextResponse(
        JSON.stringify({
          isAdmin: false,
          message: 'Invalid admin credentials'
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      response.cookies.delete('admin_token');
      response.cookies.delete('admin_email');
      return response;
    }

    return new NextResponse(
      JSON.stringify({
        isAdmin: true,
        email: adminEmail.value
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Clear cookies on error
    const response = new NextResponse(
      JSON.stringify({
        isAdmin: false,
        message: 'Error checking admin status'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
    
    response.cookies.delete('admin_token');
    response.cookies.delete('admin_email');
    return response;
  }
} 