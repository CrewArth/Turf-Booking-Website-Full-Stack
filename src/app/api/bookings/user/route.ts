import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import dbConnect from '@/lib/db';
import { Booking } from '@/models/Booking';

export async function GET(req: Request) {
  try {
    // Get the authenticated user
    const { userId } = auth();
    console.log('Attempting to fetch bookings for user:', userId);
    
    if (!userId) {
      console.log('No user ID found in request');
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
    try {
      await dbConnect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: 'Unable to connect to the database. Please try again later.',
          details: process.env.NODE_ENV === 'development' ? dbError : undefined
        },
        { status: 500 }
      );
    }

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
    try {
      const bookings = await Booking.find(query)
        .populate('slotId')
        .sort({ createdAt: -1 })
        .lean();

      console.log('Bookings found:', {
        count: bookings.length,
        sampleBooking: bookings[0] ? {
          id: bookings[0]._id,
          date: bookings[0].date,
          status: bookings[0].status,
          slotId: bookings[0].slotId?._id
        } : null
      });

      return NextResponse.json({
        success: true,
        bookings,
        count: bookings.length
      });
    } catch (queryError) {
      console.error('Error querying bookings:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch bookings',
          message: 'Error retrieving your bookings from the database',
          details: process.env.NODE_ENV === 'development' ? queryError : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in bookings API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching your bookings',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 