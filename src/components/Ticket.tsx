import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';

interface Ticket {
  ticketNumber: string;
  qrCode: string;
  createdAt: string;
  bookingId: {
    date: string;
    slotId: {
      time: string;
      price: number;
    };
    bothTurfs: boolean;
  };
}

interface TicketProps {
  ticket: Ticket;
}

function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time;
  }
}

const Ticket = ({ ticket }: TicketProps) => {
  if (!ticket) {
    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto p-6">
        <p className="text-center text-gray-600">Ticket information not available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="p-6 border-b border-dashed border-gray-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Turf 106</h2>
            <p className="text-sm text-gray-500">Your booking is confirmed!</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Ticket Number</p>
            <p className="text-lg font-semibold text-gray-900">{ticket.ticketNumber}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(ticket.bookingId.date), 'MMMM d, yyyy')}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Time</p>
            <p className="text-lg font-semibold text-gray-900">
              {ticket.bookingId.slotId.time}
            </p>
          </div>

          {ticket.bookingId.bothTurfs && (
            <div>
              <p className="text-sm text-orange-600 font-medium">Both Turfs Booked</p>
            </div>
          )}

          <div>
            <p className="text-sm text-gray-500">Amount Paid</p>
            <p className="text-lg font-semibold text-gray-900">
              ₹{ticket.bookingId.bothTurfs ? ticket.bookingId.slotId.price * 2 : ticket.bookingId.slotId.price}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="mb-4">
            <p className="text-sm text-gray-500 text-center">
              Please show this QR code at the venue
            </p>
          </div>
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <img
              src={ticket.qrCode}
              alt="QR Code"
              className="w-48 h-48 object-contain"
            />
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-400 text-center">
              Generated on {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ticket; 