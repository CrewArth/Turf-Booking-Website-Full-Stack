import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import dbConnect from '@/lib/db';
import { Booking } from '@/models/Booking';

export async function GET(req: Request) {
  try {
    // Get the authenticated user
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          message: 'Please sign in to view your bookings'
        },
        { status: 401 }
      );
    }

    // Connect to database
    console.log('Connecting to database for user bookings...');
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    // Build query
    const query: any = { userId };
    if (status) query.status = status;
    if (date) query.date = date;

    console.log('Fetching bookings with query:', {
      userId,
      status: status || 'all',
      date: date || 'all'
    });

    // Fetch bookings with populated slot details
    const bookings = await Booking.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 })
      .lean();

    console.log('Bookings found:', {
      count: bookings.length,
      sampleBooking: bookings[0] ? {
        id: bookings[0]._id,
        date: bookings[0].date,
        status: bookings[0].status
      } : null
    });

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bookings',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 