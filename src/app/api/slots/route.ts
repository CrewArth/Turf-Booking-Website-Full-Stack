import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';
import { auth } from '@clerk/nextjs';

// Add response caching for 5 minutes
export const revalidate = 300;

// Cache for slot data
const slotCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET(req: Request) {
  try {
    // Get date from query params
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const isAdmin = req.headers.get('cookie')?.includes('admin_token=true');

    console.log('Received request for date:', date);

    // Check cache first
    const cacheKey = `slots_${date}_${isAdmin}`;
    const cachedData = slotCache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      console.log('Returning cached data for:', cacheKey);
      return NextResponse.json(cachedData.data);
    }

    await dbConnect();

    // For admin view, return all slots with minimal projection
    if (isAdmin && !date) {
      const slots = await Slot.find(
        {},
        { time: 1, date: 1, price: 1, totalCapacity: 1, isEnabled: 1 }
      ).lean().sort({ date: 1, time: 1 });

      // Cache the results
      slotCache.set(cacheKey, { data: slots, timestamp: Date.now() });
      return NextResponse.json(slots);
    }

    // For customer view, require date parameter
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Ensure date is in YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split('T')[0];

    // Optimize query with lean() and specific projection
    const slots = await Slot.find(
      { 
        date: formattedDate,
        isEnabled: true 
      },
      {
        time: 1,
        price: 1,
        totalCapacity: 1,
        isNight: 1,
        isEnabled: 1
      }
    )
    .lean()
    .sort({ time: 1 })
    .hint({ date: 1, time: 1 }); // Use compound index

    console.log(`Found ${slots.length} slots for date ${formattedDate}`);

    // Cache the results
    slotCache.set(cacheKey, { data: slots, timestamp: Date.now() });
    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 });
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