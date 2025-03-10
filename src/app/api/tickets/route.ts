import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { Ticket } from '@/models/Ticket';
import { Booking } from '@/models/Booking';
import { Slot } from '@/models/Slot';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    console.log('Generating ticket for user:', userId);
    
    if (!userId) {
      console.log('No user ID found in request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    console.log('Connecting to database...');
    try {
      await dbConnect();
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return NextResponse.json(
        {
          error: 'Database connection failed',
          message: 'Unable to connect to the database',
          details: process.env.NODE_ENV === 'development' ? dbError : undefined
        },
        { status: 500 }
      );
    }

    const { bookingId } = await req.json();
    console.log('Generating ticket for booking:', bookingId);

    try {
      // Verify booking exists and belongs to user
      const booking = await Booking.findOne({
        _id: bookingId,
        userId,
        status: 'confirmed'
      }).populate('slotId');

      if (!booking) {
        console.log('Booking not found or not confirmed:', bookingId);
        return NextResponse.json({ 
          error: 'Booking not found',
          message: 'Unable to find a confirmed booking with the provided ID'
        }, { status: 404 });
      }

      // Check if ticket already exists
      let ticket = await Ticket.findOne({ bookingId }).populate({
        path: 'bookingId',
        populate: { path: 'slotId' }
      });
      
      if (ticket) {
        console.log('Existing ticket found:', ticket._id);
        return NextResponse.json(ticket);
      }

      // Generate QR code data
      const qrData = {
        ticketNumber: `TF${Date.now()}`,
        bookingId: booking._id.toString(),
        userId,
        date: booking.date,
        time: booking.slotId.time,
        amount: booking.amount
      };

      console.log('Generating QR code with data:', qrData);

      // Generate QR code
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

      // Create ticket
      ticket = await Ticket.create({
        bookingId: booking._id,
        userId,
        qrCode,
        ticketNumber: qrData.ticketNumber
      });

      console.log('Ticket created:', ticket._id);

      // Populate the ticket data before returning
      ticket = await Ticket.findById(ticket._id).populate({
        path: 'bookingId',
        populate: { path: 'slotId' }
      });

      return NextResponse.json(ticket);
    } catch (queryError) {
      console.error('Error generating ticket:', queryError);
      return NextResponse.json(
        {
          error: 'Failed to generate ticket',
          message: 'Error occurred while generating the ticket',
          details: process.env.NODE_ENV === 'development' ? queryError : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error in tickets API:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while generating the ticket',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get tickets for user
    const tickets = await Ticket.find({ userId })
      .populate({
        path: 'bookingId',
        populate: { path: 'slotId' }
      })
      .sort({ createdAt: -1 });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
} 