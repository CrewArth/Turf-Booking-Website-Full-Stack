'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { format } from 'date-fns';
import Link from 'next/link';
import Ticket from '@/components/Ticket';

interface Slot {
  _id: string;
  time: string;
  price: number;
  totalCapacity: number;
  isNight: boolean;
  isEnabled: boolean;
}

interface Booking {
  _id: string;
  slotId: Slot;
  date: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
  ticket?: {
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

export default function BookingsPage() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showTicket, setShowTicket] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching bookings...');
      const response = await fetch('/api/bookings/user');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(
          errorData?.message || 
          `Failed to fetch bookings (HTTP ${response.status})`
        );
      }

      const data = await response.json();
      console.log('Bookings data:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch bookings');
      }

      const bookingsData = data.bookings || [];
      console.log('Processing bookings:', {
        count: bookingsData.length,
        sample: bookingsData[0] ? {
          id: bookingsData[0]._id,
          date: bookingsData[0].date,
          status: bookingsData[0].status
        } : null
      });

      // Fetch tickets for confirmed bookings
      const bookingsWithTickets = await Promise.all(
        bookingsData.map(async (booking: Booking) => {
          if (booking.status === 'confirmed') {
            try {
              const ticketResponse = await fetch('/api/tickets', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bookingId: booking._id }),
              });

              if (!ticketResponse.ok) {
                console.error('Failed to fetch ticket:', {
                  status: ticketResponse.status,
                  bookingId: booking._id
                });
                return booking;
              }

              const ticket = await ticketResponse.json();
              return { ...booking, ticket };
            } catch (error) {
              console.error('Failed to fetch ticket for booking:', booking._id, error);
              return booking;
            }
          }
          return booking;
        })
      );

      console.log('Bookings with tickets:', {
        count: bookingsWithTickets.length,
        withTickets: bookingsWithTickets.filter(b => b.ticket).length
      });
      setBookings(bookingsWithTickets);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to fetch your bookings. Please try again.'
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowTicket(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-2 text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <Link
              href="/book"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Book New Slot
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="bg-gray-100 rounded-full p-3">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Bookings Found</h3>
              <p className="mt-2 text-sm text-gray-500 text-center max-w-sm">
                You haven't made any bookings yet. Start by booking a slot for your preferred date and time.
              </p>
              <Link
                href="/book"
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Book Your First Slot
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking._id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      {booking.slotId.isNight ? (
                        <span className="text-2xl">🌙</span>
                      ) : (
                        <span className="text-2xl">☀️</span>
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {format(new Date(booking.date), 'MMMM d, yyyy')}
                        </h3>
                        <p className="text-gray-600">{formatTime(booking.slotId.time)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Price</p>
                        <p className="text-lg font-bold text-gray-900">₹{booking.slotId.price}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </div>
                    </div>

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleViewTicket(booking)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                      >
                        View Ticket
                      </button>
                    )}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    Booked on {format(new Date(booking.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicket && selectedBooking?.ticket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8">
            <div className="p-4 relative max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowTicket(false)}
                className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 z-10 bg-white rounded-full p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <Ticket ticket={selectedBooking.ticket} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 