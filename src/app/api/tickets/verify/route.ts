import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import dbConnect from '@/lib/db';
import { Ticket } from '@/models/Ticket';

export async function POST(req: Request) {
  try {
    // Check if user is admin
    const cookies = req.headers.get('cookie');
    if (!cookies?.includes('admin_token=true')) {
      return NextResponse.json({ 
        isValid: false,
        message: 'Unauthorized access'
      }, { status: 401 });
    }

    await dbConnect();
    const { ticketNumber } = await req.json();

    if (!ticketNumber) {
      return NextResponse.json({ 
        isValid: false,
        message: 'Ticket number is required'
      }, { status: 400 });
    }

    // Find the ticket and populate booking details
    const ticket = await Ticket.findOne({ ticketNumber }).populate({
      path: 'bookingId',
      populate: { path: 'slotId' }
    });

    if (!ticket) {
      return NextResponse.json({ 
        isValid: false,
        message: 'Invalid ticket'
      }, { status: 404 });
    }

    // Check if booking is confirmed
    if (ticket.bookingId.status !== 'confirmed') {
      return NextResponse.json({ 
        isValid: false,
        message: 'Booking is not confirmed'
      }, { status: 400 });
    }

    // Check if ticket has already been used
    if (ticket.isUsed) {
      return NextResponse.json({
        isValid: true,
        ticket: ticket.toObject(),
        message: 'Ticket has already been used'
      });
    }

    // Check if the ticket is for today
    const ticketDate = new Date(ticket.bookingId.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    ticketDate.setHours(0, 0, 0, 0);

    if (ticketDate.getTime() !== today.getTime()) {
      return NextResponse.json({ 
        isValid: false,
        message: ticketDate < today ? 'Ticket has expired' : 'Ticket is for a future date'
      }, { status: 400 });
    }

    // Mark ticket as used
    ticket.isUsed = true;
    ticket.usedAt = new Date();
    await ticket.save();

    return NextResponse.json({
      isValid: true,
      ticket: ticket.toObject(),
      message: 'Ticket verified successfully'
    });
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return NextResponse.json({ 
      isValid: false,
      message: 'Failed to verify ticket'
    }, { status: 500 });
  }
} 