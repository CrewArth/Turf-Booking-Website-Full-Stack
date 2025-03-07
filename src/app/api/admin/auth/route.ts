import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/Admin';
import crypto from 'crypto';

// Validate environment variables
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Missing required environment variables: ADMIN_EMAIL and/or ADMIN_PASSWORD');
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const maxDuration = 60; // Set max duration to 60 seconds

export async function POST(req: Request) {
  try {
    console.log('Admin auth request received');
    
    // Validate environment variables
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('Admin credentials not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error',
          message: 'Admin credentials not properly configured'
        },
        { status: 500 }
      );
    }

    const { email, password } = await req.json();

    // Debug log
    console.log('Attempting login with:', {
      providedEmail: email,
      expectedEmail: ADMIN_EMAIL,
      emailMatch: email === ADMIN_EMAIL,
      passwordProvided: !!password,
    });

    try {
      console.log('Connecting to database...');
      await dbConnect();
      console.log('Database connection established');
      console.log('Database connection established');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: 'Unable to connect to the database'
        },
        { status: 500 }
      );
    }

    // First check if it's the default admin
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      console.log('Default admin authentication successful');
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

    console.log('Checking database for admin...');
    // If not default admin, check in database
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    console.log('Database query completed:', { adminFound: !!admin });
    
    if (admin) {
      // Hash the provided password and compare
      const hash = crypto.createHash('sha256');
      const hashedPassword = hash.update(password).digest('hex');
      
      if (admin.password === hashedPassword) {
        console.log('Database admin authentication successful');
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

    console.log('Authentication failed: Invalid credentials');
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
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 