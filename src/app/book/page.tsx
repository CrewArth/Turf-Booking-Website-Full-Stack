'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { format, addDays } from 'date-fns';
import { loadRazorpayScript, createPaymentOrder } from '@/lib/razorpay';

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
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
}

export default function BookingPage() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Cache for slots data
  const [slotsCache, setSlotsCache] = useState<Record<string, Slot[]>>({});
  const [bookingsCache, setBookingsCache] = useState<Record<string, Booking[]>>({});

  // Keep track of the last successful fetch
  const lastFetchRef = useRef<string>('');

  // Add loading states for better UX
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Record<string, number>>({});

  // Cache timeout (5 minutes)
  const CACHE_TIMEOUT = 5 * 60 * 1000;
  const STALE_WHILE_REVALIDATE = 30 * 1000; // 30 seconds

  // Add type definition for fetch options
  interface FetchOptions extends RequestInit {
    headers?: HeadersInit;
  }

  // Optimized fetch function with SWR-like behavior
  const fetchWithCache = async (url: string, options: FetchOptions = {}) => {
    const cacheKey = `fetch_${url}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Return cached data immediately if fresh
      if (age < CACHE_TIMEOUT) {
        return data;
      }
      
      // Return stale data while revalidating if within SWR window
      if (age < CACHE_TIMEOUT + STALE_WHILE_REVALIDATE) {
        // Revalidate in background
        fetchWithCache(url, options).catch(console.error);
        return data;
      }
    }
    
    // Fetch fresh data
    const response = await fetch(url, {
      ...options,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...(options.headers || {})
      }
    });
    
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    
    // Cache the fresh data
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    
    return data;
  };

  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const now = Date.now();
      
      // Check if we need to refresh the cache
      const shouldRefreshCache = !lastUpdate[formattedDate] || 
        (now - lastUpdate[formattedDate]) > CACHE_TIMEOUT;

      // Use cache if available and not expired
      if (!shouldRefreshCache && slotsCache[formattedDate] && bookingsCache[formattedDate]) {
        setSlots(slotsCache[formattedDate]);
        setBookings(bookingsCache[formattedDate]);
        setIsLoadingSlots(false);
        setIsLoadingBookings(false);
        return;
      }

      // Fetch new data if needed
      fetchSlots(formattedDate);
      fetchBookings(formattedDate);
    }
  }, [selectedDate]);

  const fetchSlots = async (formattedDate: string) => {
    if (isLoadingSlots) return; // Prevent concurrent fetches

    try {
      setIsLoadingSlots(true);
      setError(null);
      
      // Use optimized fetch function
      const data = await fetchWithCache(`/api/slots?date=${formattedDate}`);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      // Filter and sort slots
      const enabledSlots = data
        .filter(slot => slot.isEnabled)
        .sort((a, b) => a.time.localeCompare(b.time));
      
      // Update cache and state
      setSlotsCache(prev => ({ ...prev, [formattedDate]: enabledSlots }));
      setSlots(enabledSlots);
      setLastUpdate(prev => ({ ...prev, [formattedDate]: Date.now() }));
      
      if (enabledSlots.length === 0) {
        setError('No slots available for this date');
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      // Keep showing old slots if available
      if (!slots.length) {
        setError('Failed to fetch slots. Please try again.');
      }
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchBookings = async (formattedDate: string) => {
    if (isLoadingBookings) return; // Prevent concurrent fetches

    try {
      setIsLoadingBookings(true);
      
      // Use optimized fetch function
      const data = await fetchWithCache(`/api/bookings?date=${formattedDate}`);
      const bookingsData = Array.isArray(data) ? data : [];
      
      // Update cache and state
      setBookingsCache(prev => ({ ...prev, [formattedDate]: bookingsData }));
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      // Keep showing old bookings if available
      if (!bookings.length) {
        setError('Failed to fetch bookings. Please try again.');
      }
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const refreshData = async () => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    await Promise.all([
      fetchSlots(formattedDate),
      fetchBookings(formattedDate)
    ]);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setError(null);
  };

  const handleSlotSelect = (slot: Slot) => {
    if (getAvailableSlots(slot._id) > 0) {
      setSelectedSlot(slot);
      setError(null);
    }
  };

  const getAvailableSlots = (slotId: string) => {
    if (!Array.isArray(bookings)) return 0;
    
    const bookedCount = bookings.filter(
      (booking) =>
        booking.slotId._id === slotId &&
        booking.status === 'confirmed'
    ).length;
    const slot = slots.find((s) => s._id === slotId);
    return slot ? slot.totalCapacity - bookedCount : 0;
  };

  const handleBooking = async () => {
    if (!selectedSlot || !user || isProcessing) return;

    try {
      setIsProcessing(true);
      setPaymentError(null);

      // Load Razorpay script
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create payment order
      const orderResponse = await createPaymentOrder({
        amount: selectedSlot.price,
        notes: {
          slotId: selectedSlot._id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedSlot.time,
        },
      });

      // Initialize Razorpay payment
      const options = {
        key: orderResponse.key,
        amount: orderResponse.amount,
        currency: orderResponse.currency,
        name: 'Turf 106',
        description: `Booking for ${format(selectedDate, 'dd MMM yyyy')} at ${formatTime(selectedSlot.time)}`,
        order_id: orderResponse.orderId,
        prefill: {
          name: user.fullName,
          email: user.primaryEmailAddress?.emailAddress,
        },
        handler: async function (response: any) {
          try {
            console.log('Payment response:', response);
            
            // Create booking with payment details
            const bookingResponse = await fetch('/api/bookings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                slotId: selectedSlot._id,
                date: format(selectedDate, 'yyyy-MM-dd'),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                amount: selectedSlot.price,
              }),
            });

            if (!bookingResponse.ok) {
              const errorData = await bookingResponse.json();
              throw new Error(errorData.error || 'Booking failed');
            }

            const bookingData = await bookingResponse.json();
            console.log('Booking created:', bookingData);

            // Generate ticket
            const ticketResponse = await fetch('/api/tickets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: bookingData.booking._id,
              }),
            });

            if (!ticketResponse.ok) {
              console.error('Failed to generate ticket:', await ticketResponse.text());
            }

            // Show success message and redirect
            alert('Booking confirmed successfully! Your ticket has been generated.');
            window.location.href = '/bookings';
          } catch (error) {
            console.error('Booking error:', error);
            setPaymentError('Failed to complete booking. Please try again.');
            // Refresh slots to show updated availability
            await Promise.all([fetchSlots(format(selectedDate, 'yyyy-MM-dd')), fetchBookings(format(selectedDate, 'yyyy-MM-dd'))]);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            // Refresh slots to show updated availability
            Promise.all([fetchSlots(format(selectedDate, 'yyyy-MM-dd')), fetchBookings(format(selectedDate, 'yyyy-MM-dd'))]);
          },
          escape: true,
        },
        theme: {
          color: '#16a34a',
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function(response: any) {
        console.error('Payment failed:', response.error);
        setPaymentError(response.error.description || 'Payment failed. Please try again.');
        setIsProcessing(false);
      });
      
      rzp.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Failed to initialize payment');
      setIsProcessing(false);
      // Refresh slots to show updated availability
      await Promise.all([fetchSlots(format(selectedDate, 'yyyy-MM-dd')), fetchBookings(format(selectedDate, 'yyyy-MM-dd'))]);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Select Date & Time</h1>
            <div className="flex items-center space-x-2">
              <span className="flex items-center text-sm text-gray-600">
                <span className="w-3 h-3 bg-green-100 border border-green-500 rounded-full mr-1"></span>
                Available
              </span>
              <span className="flex items-center text-sm text-gray-600">
                <span className="w-3 h-3 bg-red-100 border border-red-200 rounded-full mr-1"></span>
                Booked
              </span>
            </div>
          </div>

          {/* Date Selection - Always visible */}
          <div className="relative mb-8">
            <div className="absolute left-0 right-0 bottom-0 h-2 bg-gradient-to-r from-gray-100 via-transparent to-gray-100" />
            <div 
              className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {nextDays.map((date) => (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  className={`flex-shrink-0 px-6 py-3 rounded-lg transition-colors ${
                    format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-green-500'
                  }`}
                >
                  <div className="text-sm font-medium">{format(date, 'EEE')}</div>
                  <div className="text-lg font-semibold">{format(date, 'd')}</div>
                  <div className="text-sm font-medium">{format(date, 'MMM')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Section */}
          <div className="mt-8">
            {isLoadingSlots && !slots.length ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : error && !slots.length ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <svg 
                    className="mx-auto h-12 w-12 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Slots Available</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    There are no slots available for {format(selectedDate, 'MMMM d, yyyy')}.
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Please try selecting a different date or contact us for assistance.
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <a
                      href="#contact"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Contact Us
                    </a>
                    <button
                      onClick={() => {
                        setError(null);
                        fetchSlots(format(selectedDate, 'yyyy-MM-dd'));
                        fetchBookings(format(selectedDate, 'yyyy-MM-dd'));
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {slots.map((slot) => {
                  const availableSlots = getAvailableSlots(slot._id);
                  const isBooked = availableSlots === 0;
                  const isLastSlot = availableSlots === 1;
                  const isSelected = selectedSlot?._id === slot._id;

                  return (
                    <div
                      key={slot._id}
                      onClick={() => !isBooked && handleSlotSelect(slot)}
                      className={`p-4 rounded-lg border transition-all ${
                        isBooked
                          ? 'bg-red-50 border-red-200 cursor-not-allowed'
                          : isSelected
                          ? isLastSlot 
                            ? 'bg-yellow-50 border-yellow-500 shadow-md'
                            : 'bg-green-50 border-green-500 shadow-md'
                          : isLastSlot
                          ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-500 hover:shadow-md cursor-pointer'
                          : 'bg-white border-gray-200 hover:border-green-500 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        {/* Time and Status */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {slot.isNight ? (
                                <span className="text-xl">🌙</span>
                              ) : (
                                <span className="text-xl">☀️</span>
                              )}
                              <span className="text-lg font-semibold text-gray-900">
                                {formatTime(slot.time)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`text-xs font-medium px-2 py-1 rounded-full mb-2 text-center ${
                          isBooked 
                            ? 'bg-red-100 text-red-800' 
                            : isLastSlot
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {isBooked 
                            ? 'Fully Booked' 
                            : isLastSlot
                            ? 'Last slot available!'
                            : `${availableSlots} slots available`}
                        </div>

                        {/* Price */}
                        <div className="mt-auto">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Capacity:</span>
                            <span className="font-medium text-gray-900">{slot.totalCapacity}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-600 text-sm">Price:</span>
                            <span className="text-lg font-bold text-gray-900">₹{slot.price}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Floating Book Button */}
      {selectedSlot && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-200 shadow-lg transform transition-transform duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2">
                  {selectedSlot.isNight ? (
                    <span className="text-xl">🌙</span>
                  ) : (
                    <span className="text-xl">☀️</span>
                  )}
                  <span className="text-lg font-semibold text-gray-900">
                    {formatTime(selectedSlot.time)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ₹{selectedSlot.price}
                </div>
              </div>
              <button
                onClick={handleBooking}
                className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Error Message */}
      {paymentError && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-red-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Payment Error</p>
              <p className="text-sm">{paymentError}</p>
            </div>
            <button
              onClick={() => setPaymentError(null)}
              className="ml-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg p-1.5 hover:bg-red-100 inline-flex h-8 w-8"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Add a refresh button */}
      <button
        onClick={refreshData}
        className="fixed bottom-24 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50"
        title="Refresh slots"
      >
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
} 