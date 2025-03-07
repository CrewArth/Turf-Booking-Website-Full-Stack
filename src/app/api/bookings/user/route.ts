import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Booking } from '@/models/Booking';
import { auth } from '@clerk/nextjs';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    
    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - Please sign in' }, { status: 401 });
    }

    await dbConnect();

    console.log('Fetching bookings for user:', userId);

    // Fetch user's bookings with populated slot information
    const bookings = await Booking.find({ userId })
      .populate('slotId')
      .sort({ date: -1 }); // Most recent bookings first

    // Update status for bookings with payment details
    const updatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        if (booking.paymentId && booking.orderId && booking.signature && booking.status === 'pending') {
          booking.status = 'confirmed';
          await booking.save();
        }
        return booking;
      })
    );

    console.log('Found bookings:', updatedBookings);

    return NextResponse.json(updatedBookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch bookings', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
} 