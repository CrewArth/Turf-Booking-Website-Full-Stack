import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import dbConnect from '@/lib/db';
import { Booking } from '@/models/Booking';
import { Slot } from '@/models/Slot';
import { verifyRazorpayPayment } from '@/lib/razorpay';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    console.log('Fetching bookings for date:', date);

    await dbConnect();
    console.log('Database connected');

    const query: any = {};
    if (date) {
      query.date = date;
    }

    console.log('Query:', query);

    const bookings = await Booking.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${bookings.length} bookings`);

    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error in GET /api/bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    console.log('Creating booking for user:', userId);

    if (!userId) {
      console.log('No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    console.log('Database connected');

    const {
      slotId,
      date,
      paymentId,
      orderId,
      signature,
      amount,
      bothTurfs
    } = await req.json();

    console.log('Received booking data:', {
      slotId,
      date,
      paymentId,
      orderId,
      amount,
      bothTurfs
    });

    // Verify payment signature
    const isValidPayment = verifyRazorpayPayment({
      orderId,
      paymentId,
      signature
    });

    if (!isValidPayment) {
      console.error('Invalid payment signature');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Check if slot exists and has capacity
    const slot = await Slot.findById(slotId);
    if (!slot) {
      console.error('Slot not found:', slotId);
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    // Count existing confirmed bookings for this slot
    const existingBookings = await Booking.countDocuments({
      slotId,
      date,
      status: 'confirmed'
    });

    console.log('Existing bookings:', existingBookings, 'Total capacity:', slot.totalCapacity);

    // Check capacity based on whether booking both turfs
    const requiredCapacity = bothTurfs ? 2 : 1;
    if (existingBookings + requiredCapacity > slot.totalCapacity) {
      console.error('Slot is fully booked');
      return NextResponse.json(
        { error: bothTurfs ? 'Both turfs are not available' : 'Slot is fully booked' },
        { status: 400 }
      );
    }

    // Check for existing booking by this user for this slot
    const existingBooking = await Booking.findOne({
      userId,
      slotId,
      date
    });

    if (existingBooking) {
      console.error('User already has a booking for this slot');
      return NextResponse.json(
        { error: 'You already have a booking for this slot' },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await Booking.create({
      userId,
      slotId,
      date,
      amount,
      status: 'confirmed',
      bothTurfs,
      paymentDetails: {
        paymentId,
        orderId,
        amount
      }
    });

    console.log('Booking created successfully:', booking._id);

    // Populate slot details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('slotId')
      .lean();

    return NextResponse.json({
      success: true,
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Error in POST /api/bookings:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 