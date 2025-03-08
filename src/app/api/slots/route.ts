import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';
import { auth } from '@clerk/nextjs';
import mongoose from 'mongoose';

// Add response caching for 5 minutes
export const revalidate = 300;

// Cache for slot data
const slotCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    // Get date from query params
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const isAdmin = req.headers.get('cookie')?.includes('admin_token=true');

    console.log(`[${requestId}] Slots request received:`, {
      date,
      isAdmin,
      url: req.url,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });

    // Connect to database first
    console.log(`[${requestId}] Connecting to database...`);
    await dbConnect();
    console.log(`[${requestId}] Database connection established`);

    // Verify database connection
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready');
    }

    // For customer view, require date parameter
    if (!date) {
      console.log(`[${requestId}] No date parameter provided`);
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Ensure date is valid
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.log(`[${requestId}] Invalid date provided:`, date);
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Format date to YYYY-MM-DD
    const formattedDate = dateObj.toISOString().split('T')[0];
    console.log(`[${requestId}] Formatted date:`, formattedDate);

    // Check cache
    const cacheKey = `slots_${formattedDate}_${isAdmin}`;
    const cachedData = slotCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log(`[${requestId}] Returning cached data for:`, cacheKey);
      return NextResponse.json(cachedData.data);
    }

    // Query slots with timeout
    const queryPromise = Slot.find(
      { 
        date: formattedDate,
        isEnabled: true 
      },
      {
        _id: 1,
        time: 1,
        price: 1,
        totalCapacity: 1,
        isNight: 1,
        isEnabled: 1
      }
    )
    .lean()
    .sort({ time: 1 });

    // Add 5-second timeout to query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 5000);
    });

    console.log(`[${requestId}] Executing slot query for date:`, formattedDate);
    const slots = await Promise.race([queryPromise, timeoutPromise]) as any[];

    const executionTime = Date.now() - startTime;
    console.log(`[${requestId}] Query completed in ${executionTime}ms. Found ${slots.length} slots`);

    if (slots.length > 0) {
      console.log(`[${requestId}] Sample slot:`, slots[0]);
    } else {
      console.log(`[${requestId}] No slots found for date:`, formattedDate);
    }

    // Cache the results
    const response = {
      slots,
      debug: process.env.NODE_ENV === 'development' ? {
        requestId,
        executionTime,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        query: { date: formattedDate, isEnabled: true }
      } : undefined
    };

    slotCache.set(cacheKey, { 
      data: response, 
      timestamp: Date.now() 
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[${requestId}] Error fetching slots:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - startTime
    });

    // Clear cache if there's an error
    slotCache.clear();

    return NextResponse.json({ 
      error: 'Failed to fetch slots',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      requestId
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Check for admin token in cookies
    const cookies = req.headers.get('cookie');
    const hasAdminToken = cookies?.includes('admin_token=true');

    if (!hasAdminToken) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();

    // Validate the slot data
    if (!data.time || !data.date || typeof data.price !== 'number' || data.price < 0) {
      return NextResponse.json({ 
        error: 'Invalid slot data', 
        details: 'Date, time, and valid price are required' 
      }, { status: 400 });
    }

    // Ensure date is in YYYY-MM-DD format
    const formattedDate = new Date(data.date).toISOString().split('T')[0];
    data.date = formattedDate;

    // Check if slot already exists for this date and time
    const existingSlot = await Slot.findOne({
      date: formattedDate,
      time: data.time
    });

    if (existingSlot) {
      return NextResponse.json({ 
        error: 'Slot already exists', 
        details: 'A slot for this date and time already exists' 
      }, { status: 400 });
    }

    const slot = await Slot.create({
      ...data,
      isEnabled: true // Ensure new slots are enabled by default
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Slot created successfully',
      slot 
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    return NextResponse.json({ 
      error: 'Failed to create slot',
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