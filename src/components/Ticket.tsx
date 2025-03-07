import React from 'react';
import Image from 'next/image';
import { format } from 'date-fns';

interface TicketProps {
  ticket: {
    ticketNumber: string;
    qrCode: string;
    createdAt: string;
    bookingId: {
      date: string;
      slotId: {
        time: string;
        price: number;
      };
    };
  };
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

export default function Ticket({ ticket }: TicketProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md mx-auto">
      {/* Ticket Header */}
      <div className="bg-green-600 px-6 py-4">
        <h3 className="text-white text-xl font-bold">Turf 106 - Booking Ticket</h3>
      </div>

      {/* Ticket Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm text-gray-600">Ticket Number</p>
            <p className="text-lg font-semibold text-gray-900">{ticket.ticketNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Booking Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {format(new Date(ticket.bookingId.date), 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-sm text-gray-600">Time Slot</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatTime(ticket.bookingId.slotId.time)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Amount Paid</p>
            <p className="text-lg font-semibold text-gray-900">
              ₹{ticket.bookingId.slotId.price}
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="relative w-48 h-48">
            <Image
              src={ticket.qrCode}
              alt="Ticket QR Code"
              fill
              className="object-contain"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>Generated on {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</p>
          <p className="mt-2">Please show this ticket at the venue</p>
        </div>
      </div>

      {/* Ticket Footer */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Turf 106</span>
          <span className="text-gray-600">Valid for one-time use only</span>
        </div>
      </div>
    </div>
  );
} 