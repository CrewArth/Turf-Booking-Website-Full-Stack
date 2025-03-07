import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Booking } from '@/models/Booking';
import { auth } from '@clerk/nextjs';

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Create start and end of day for the given date
    const startDate = new Date(dateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('slotId');

    return NextResponse.json(bookings || []);
  } catch (error) {
    console.error('Booking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to make a booking' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();
    
    if (!data.slotId || !data.date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if slot is already booked for the given date
    const existingBooking = await Booking.findOne({
      slotId: data.slotId,
      date: new Date(data.date),
      userId: userId,
    });

    // If booking exists, update its status to confirmed if payment details are present
    if (existingBooking) {
      if (data.paymentId && data.orderId && data.signature) {
        existingBooking.status = 'confirmed';
        existingBooking.paymentId = data.paymentId;
        existingBooking.orderId = data.orderId;
        existingBooking.signature = data.signature;
        existingBooking.amount = data.amount;
        
        await existingBooking.save();
        
        // Populate slot details for the response
        const populatedBooking = await Booking.findById(existingBooking._id).populate('slotId');
        
        return NextResponse.json({
          success: true,
          message: 'Booking updated successfully',
          booking: populatedBooking
        });
      }
      return NextResponse.json({ error: 'Slot already booked' }, { status: 400 });
    }

    // Set status based on payment details
    const status = data.paymentId && data.orderId && data.signature ? 'confirmed' : 'pending';

    const booking = await Booking.create({
      ...data,
      userId,
      status,
    });

    // Populate slot details for the response
    const populatedBooking = await Booking.findById(booking._id).populate('slotId');

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Booking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create booking', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 