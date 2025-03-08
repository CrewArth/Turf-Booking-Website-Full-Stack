import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';
import mongoose from 'mongoose';

// Increase cache duration to 10 minutes for better performance
const CACHE_DURATION = 10 * 60 * 1000;
const slotCache = new Map<string, { data: any; timestamp: number }>();

// Add response caching header
export const revalidate = 600; // 10 minutes

export async function GET(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const isAdmin = req.headers.get('cookie')?.includes('admin_token=true');

    // Validate date parameter early
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Format date to YYYY-MM-DD
    const formattedDate = dateObj.toISOString().split('T')[0];

    // Check cache first
    const cacheKey = `slots_${formattedDate}_${isAdmin}`;
    const cachedData = slotCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json(cachedData.data);
    }

    // Connect to database only if cache miss
    if (mongoose.connection.readyState !== 1) {
      await dbConnect();
    }

    // Optimized query with projection and lean
    const queryPromise = Slot.find(
      { date: formattedDate, isEnabled: true },
      {
        time: 1,
        price: 1,
        totalCapacity: 1,
        isNight: 1,
        _id: 1
      }
    )
    .lean()
    .sort({ time: 1 })
    .exec();

    // Reduced timeout to 3 seconds since query is optimized
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 3000);
    });

    const slots = await Promise.race([queryPromise, timeoutPromise]) as any[];

    const response = {
      slots,
      debug: process.env.NODE_ENV === 'development' ? {
        requestId,
        executionTime: Date.now() - startTime,
        cached: false
      } : undefined
    };

    // Cache the results
    slotCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return NextResponse.json({
      error: 'Failed to fetch slots',
      details: process.env.NODE_ENV === 'development' ? 
        (error instanceof Error ? error.message : 'Unknown error') : undefined
    }, { status: 500 });
  }
}

// Optimized POST endpoint
export async function POST(req: Request) {
  try {
    const cookies = req.headers.get('cookie');
    if (!cookies?.includes('admin_token=true')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await dbConnect();
    }

    const data = await req.json();

    if (!data.time || !data.date || typeof data.price !== 'number' || data.price < 0) {
      return NextResponse.json({ error: 'Invalid slot data' }, { status: 400 });
    }

    const formattedDate = new Date(data.date).toISOString().split('T')[0];

    // Use findOneAndUpdate with upsert for atomic operation
    const slot = await Slot.findOneAndUpdate(
      { date: formattedDate, time: data.time },
      { ...data, date: formattedDate, isEnabled: true },
      { upsert: true, new: true, lean: true }
    );

    // Clear cache for this date
    const cacheKeys = Array.from(slotCache.keys());
    cacheKeys.forEach(key => {
      if (key.includes(`slots_${formattedDate}`)) {
        slotCache.delete(key);
      }
    });

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('Error creating slot:', error);
    return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 });
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

    // Get slotId from query params
    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get('slotId');
    const deleteAll = searchParams.get('deleteAll');

    if (deleteAll === 'true') {
      // Delete all slots
      await Slot.deleteMany({});
      return NextResponse.json({ 
        success: true, 
        message: 'All slots deleted successfully' 
      });
    }

    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    // Delete specific slot
    const result = await Slot.findByIdAndDelete(slotId);
    
    if (!result) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Slot deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting slot(s):', error);
    return NextResponse.json({ 
      error: 'Failed to delete slot(s)',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 