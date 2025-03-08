import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    // Validate date parameter
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Format date to YYYY-MM-DD
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const formattedDate = dateObj.toISOString().split('T')[0];

    // Connect to database
    await dbConnect();

    // Simple query to get slots for the date
    const slots = await Slot.find(
      { date: formattedDate },
      {
        time: 1,
        price: 1,
        totalCapacity: 1,
        isNight: 1,
        isEnabled: 1,
        _id: 1
      }
    )
    .lean()
    .sort({ time: 1 });

    // Log the results for debugging
    console.log(`Found ${slots.length} slots for date ${formattedDate}:`, 
      slots.map(s => ({ time: s.time, enabled: s.isEnabled }))
    );

    return NextResponse.json({ 
      success: true,
      slots,
      date: formattedDate
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch slots',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookies = req.headers.get('cookie');
    if (!cookies?.includes('admin_token=true')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();

    // Validate required fields
    if (!data.time || !data.date || typeof data.price !== 'number' || data.price < 0) {
      return NextResponse.json({ error: 'Invalid slot data' }, { status: 400 });
    }

    // Format date
    const formattedDate = new Date(data.date).toISOString().split('T')[0];

    // Create or update slot
    const slot = await Slot.findOneAndUpdate(
      { date: formattedDate, time: data.time },
      { 
        ...data, 
        date: formattedDate,
        isEnabled: data.isEnabled ?? true
      },
      { upsert: true, new: true, lean: true }
    );

    console.log('Slot created/updated:', {
      date: slot.date,
      time: slot.time,
      enabled: slot.isEnabled
    });

    return NextResponse.json({ success: true, slot });
  } catch (error) {
    console.error('Error creating/updating slot:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create/update slot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookies = req.headers.get('cookie');
    if (!cookies?.includes('admin_token=true')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get('slotId');

    if (!slotId) {
      return NextResponse.json({ error: 'Slot ID is required' }, { status: 400 });
    }

    const result = await Slot.findByIdAndDelete(slotId);
    if (!result) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    console.log('Slot deleted:', {
      id: slotId,
      date: result.date,
      time: result.time
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slot:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete slot',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 