import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Admin } from '@/models/Admin';

// Helper function to verify admin token
async function verifyAdmin(cookies: string | null) {
  if (!cookies?.includes('admin_token=true')) {
    return false;
  }
  return true;
}

export async function GET(req: Request) {
  try {
    const isAdmin = await verifyAdmin(req.headers.get('cookie'));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const admins = await Admin.find({}, { password: 0 }).sort({ createdAt: -1 });
    
    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await verifyAdmin(req.headers.get('cookie'));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();
    
    // Validate required fields
    if (!data.email || !data.password || !data.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: data.email.toLowerCase() });
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 400 }
      );
    }

    // Get current admin's email from the cookie
    const currentAdminEmail = process.env.ADMIN_EMAIL; // Default admin
    
    // Create new admin
    const admin = await Admin.create({
      ...data,
      email: data.email.toLowerCase(),
      createdBy: currentAdminEmail,
    });

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      admin: adminResponse,
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      { error: 'Failed to create admin' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const isAdmin = await verifyAdmin(req.headers.get('cookie'));
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Don't allow deleting the default admin
    if (email === process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Cannot delete default admin' },
        { status: 400 }
      );
    }

    const result = await Admin.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isActive: false }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating admin:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate admin' },
      { status: 500 }
    );
  }
} 