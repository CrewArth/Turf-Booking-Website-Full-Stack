import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/Admin';
import crypto from 'crypto';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Debug log (remove in production)
    console.log('Attempting login with:', {
      providedEmail: email,
      expectedEmail: ADMIN_EMAIL,
      emailMatch: email === ADMIN_EMAIL,
    });

    await dbConnect();

    // First check if it's the default admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const response = NextResponse.json({ 
        success: true,
        message: 'Admin authentication successful'
      });
      
      response.cookies.set('admin_token', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });
      
      return response;
    }

    // If not default admin, check in database
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (admin) {
      // Hash the provided password and compare
      const hash = crypto.createHash('sha256');
      const hashedPassword = hash.update(password).digest('hex');
      
      if (admin.password === hashedPassword) {
        const response = NextResponse.json({ 
          success: true,
          message: 'Admin authentication successful'
        });
        
        response.cookies.set('admin_token', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24, // 24 hours
        });
        
        return response;
      }
    }

    // Invalid credentials
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid credentials',
        message: 'The provided email or password is incorrect'
      },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 