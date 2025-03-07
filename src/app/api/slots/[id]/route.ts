import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check for admin token
    const cookies = req.headers.get('cookie');
    const hasAdminToken = cookies?.includes('admin_token=true');

    if (!hasAdminToken) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();
    
    // Validate the update data
    if (!data.time || typeof data.price !== 'number' || typeof data.totalCapacity !== 'number') {
      return NextResponse.json({ 
        error: 'Invalid update data', 
        details: 'Time, price, and capacity are required' 
      }, { status: 400 });
    }

    // Check if another slot exists with the same time (excluding current slot)
    const existingSlot = await Slot.findOne({
      _id: { $ne: params.id },
      time: data.time
    });

    if (existingSlot) {
      return NextResponse.json({ 
        error: 'Time conflict', 
        details: 'Another slot already exists at this time' 
      }, { status: 400 });
    }

    // Update the slot
    const updatedSlot = await Slot.findByIdAndUpdate(
      params.id,
      {
        time: data.time,
        price: data.price,
        totalCapacity: data.totalCapacity,
      },
      { new: true }
    );

    if (!updatedSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Slot updated successfully',
      slot: updatedSlot
    });
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json(
      { error: 'Failed to update slot' },
      { status: 500 }
    );
  }
} 