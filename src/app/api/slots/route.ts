import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';
import { auth } from '@clerk/nextjs';

export async function GET(req: Request) {
  try {
    await dbConnect();
    
    // Get date from query params
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const isAdmin = req.headers.get('cookie')?.includes('admin_token=true');

    console.log('Received request for date:', date);

    // For admin view, return all slots
    if (isAdmin && !date) {
      const slots = await Slot.find().sort({ date: 1, time: 1 });
      return NextResponse.json(slots);
    }

    // For customer view, require date parameter
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Ensure date is in YYYY-MM-DD format
    const formattedDate = new Date(date).toISOString().split('T')[0];
    console.log('Formatted date:', formattedDate);

    // Find slots for the specific date
    const slots = await Slot.find({ 
      date: formattedDate,
      isEnabled: true 
    }).sort({ time: 1 }); // Sort by time

    console.log(`Found ${slots.length} slots for date ${formattedDate}`);
    console.log('Slots:', JSON.stringify(slots, null, 2));

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