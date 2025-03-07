import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Gallery } from '@/models/Gallery';

export async function GET() {
  try {
    await dbConnect();
    const images = await Gallery.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery images' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check for admin token
    const cookies = req.headers.get('cookie');
    const hasAdminToken = cookies?.includes('admin_token=true');

    if (!hasAdminToken) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();

    if (!data.imageUrl || !data.title) {
      return NextResponse.json({ 
        error: 'Invalid data', 
        details: 'Image URL and title are required' 
      }, { status: 400 });
    }

    const image = await Gallery.create(data);
    return NextResponse.json({ 
      success: true, 
      message: 'Image added successfully',
      image 
    });
  } catch (error) {
    console.error('Error adding gallery image:', error);
    return NextResponse.json({ 
      error: 'Failed to add image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // Check for admin token
    const cookies = req.headers.get('cookie');
    const hasAdminToken = cookies?.includes('admin_token=true');

    if (!hasAdminToken) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    const result = await Gallery.findByIdAndDelete(imageId);
    
    if (!result) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    return NextResponse.json({ 
      error: 'Failed to delete image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 