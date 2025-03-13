import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    // Connect to database
    console.log('Connecting to database...');
    await dbConnect();
    console.log('Database connected successfully');

    // If no date is provided, return all slots (for admin panel)
    if (!date) {
      console.log('Fetching all slots for admin panel...');
      const slots = await Slot.find()
        .sort({ date: 1, time: 1 })
        .lean();
      
      console.log(`Found ${slots.length} slots`);
      return NextResponse.json(slots);
    }

    // Format date to YYYY-MM-DD
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    const formattedDate = dateObj.toISOString().split('T')[0];

    console.log('Querying slots with:', {
      date: formattedDate,
      query: { date: formattedDate }
    });

    // First, check if any slots exist for this date without filters
    const allSlotsForDate = await Slot.find({ date: formattedDate }).lean();
    console.log('All slots found for date:', {
      count: allSlotsForDate.length,
      slots: allSlotsForDate.map(s => ({
        time: s.time,
        enabled: s.isEnabled,
        id: s._id
      }))
    });

    // Then get the filtered slots
    const slots = await Slot.find(
      { date: formattedDate },
      {
        time: 1,
        price: 1,
        totalCapacity: 1,
        isNight: 1,
        isEnabled: 1,
        _id: 1,
        date: 1
      }
    )
    .lean()
    .sort({ time: 1 });

    console.log('Filtered slots:', {
      count: slots.length,
      slots: slots.map(s => ({
        time: s.time,
        enabled: s.isEnabled,
        id: s._id,
        date: s.date
      }))
    });

    return NextResponse.json(slots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch slots',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

interface SlotDocument {
  _id: string;
  date: string;
  time: string;
  price: number;
  totalCapacity: number;
  isNight: boolean;
  isEnabled: boolean;
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
    ) as SlotDocument | null;

    if (!slot) {
      throw new Error('Failed to create/update slot');
    }

    console.log('Slot created/updated:', {
      date: slot.date,
      time: slot.time,
      enabled: slot.isEnabled,
      id: slot._id
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

export async function PUT(req: Request) {
  try {
    // Check admin authentication
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

    const data = await req.json();

    // Validate required fields
    if (!data.time || !data.date || typeof data.price !== 'number' || data.price < 0) {
      return NextResponse.json({ 
        error: 'Invalid slot data',
        details: 'Required fields: time, date, price (>= 0)'
      }, { status: 400 });
    }

    // Format date
    const formattedDate = new Date(data.date).toISOString().split('T')[0];

    // Update slot
    const updatedSlot = await Slot.findByIdAndUpdate(
      slotId,
      { 
        ...data,
        date: formattedDate,
        isEnabled: data.isEnabled ?? true,
        totalCapacity: data.totalCapacity || 1
      },
      { new: true, runValidators: true }
    );

    if (!updatedSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    console.log('Slot updated:', {
      id: updatedSlot._id,
      date: updatedSlot.date,
      time: updatedSlot.time,
      capacity: updatedSlot.totalCapacity,
      enabled: updatedSlot.isEnabled
    });

    return NextResponse.json({ success: true, slot: updatedSlot });
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update slot',
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
    const deleteAll = searchParams.get('deleteAll');

    if (deleteAll === 'true') {
      // Delete all slots
      const result = await Slot.deleteMany({});
      console.log('All slots deleted:', result);
      return NextResponse.json({ 
        success: true,
        message: 'All slots deleted successfully',
        count: result.deletedCount
      });
    }

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