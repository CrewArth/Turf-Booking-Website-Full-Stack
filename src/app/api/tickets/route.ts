import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import { Ticket } from '@/models/Ticket';
import { Booking } from '@/models/Booking';
import QRCode from 'qrcode';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { bookingId } = await req.json();

    // Verify booking exists and belongs to user
    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
      status: 'confirmed'
    }).populate('slotId');

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if ticket already exists
    let ticket = await Ticket.findOne({ bookingId }).populate({
      path: 'bookingId',
      populate: { path: 'slotId' }
    });
    
    if (ticket) {
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

    // Generate QR code
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

    // Create ticket
    ticket = await Ticket.create({
      bookingId: booking._id,
      userId,
      qrCode,
      ticketNumber: qrData.ticketNumber
    });

    // Populate the ticket data before returning
    ticket = await Ticket.findById(ticket._id).populate({
      path: 'bookingId',
      populate: { path: 'slotId' }
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error generating ticket:', error);
    return NextResponse.json(
      { error: 'Failed to generate ticket' },
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