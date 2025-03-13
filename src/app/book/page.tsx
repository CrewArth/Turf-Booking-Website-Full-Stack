'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { format, addDays } from 'date-fns';
import { loadRazorpayScript, createPaymentOrder } from '@/lib/razorpay';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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
  const { user, isLoaded: isUserLoaded } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();

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

  // Add a timeout ref for fetch operations
  const fetchTimeoutRef = useRef<NodeJS.Timeout>();
  const FETCH_TIMEOUT = 10000; // 10 seconds timeout

  // Add type definition for fetch options
  interface FetchOptions extends RequestInit {
    headers?: HeadersInit;
  }

  const fetchWithTimeout = async (url: string, options: FetchOptions = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(options.headers || {})
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } finally {
      clearTimeout(id);
    }
  };

  // Add interval for real-time updates
  useEffect(() => {
    // Update current time every minute
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // every minute

    return () => clearInterval(intervalId);
  }, []);

  // Filter out passed slots
  const filterPassedSlots = (slots: Slot[]) => {
    const now = currentTime;
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayStr = format(now, 'yyyy-MM-dd');

    return slots.filter(slot => {
      // If selected date is in the future, show all slots
      if (selectedDateStr > todayStr) return true;

      // If selected date is in the past, show no slots
      if (selectedDateStr < todayStr) return false;

      // For today, compare times
      const [hours, minutes] = slot.time.split(':');
      const slotTime = new Date();
      slotTime.setHours(parseInt(hours), parseInt(minutes), 0);

      // Add 15 minutes buffer to allow last-minute bookings
      const bufferTime = new Date(now.getTime() - 15 * 60000);
      return slotTime > bufferTime;
    });
  };

  useEffect(() => {
    if (!selectedDate) return;

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

    // Reset states before fetching
    setError(null);
    setSlots([]);
    setBookings([]);

    // Fetch new data
    fetchSlots(formattedDate);
    fetchBookings(formattedDate);

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [selectedDate]);

  // Modify the fetchSlots function to filter passed slots
  const fetchSlots = async (formattedDate: string) => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set a timeout to show error if fetch takes too long
    fetchTimeoutRef.current = setTimeout(() => {
      setError('Request timed out. Please try again.');
      setIsLoadingSlots(false);
    }, FETCH_TIMEOUT);

    try {
      setIsLoadingSlots(true);
      setError(null);

      // First test the database connection
      const testResponse = await fetchWithTimeout('/api/test-db');
      console.log('Database connection test:', testResponse);

      // Then fetch slots
      const response = await fetchWithTimeout(`/api/slots?date=${formattedDate}`);
      console.log('Slots response:', response);
      
      // Handle the new response format
      const data = response.slots || response;
      
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      // Filter and sort slots
      const enabledSlots = data
        .filter(slot => slot.isEnabled)
        .sort((a, b) => a.time.localeCompare(b.time));

      // Filter out passed slots
      const availableSlots = filterPassedSlots(enabledSlots);
      
      // Update cache and state
      setSlotsCache(prev => ({ ...prev, [formattedDate]: availableSlots }));
      setSlots(availableSlots);
      setLastUpdate(prev => ({ ...prev, [formattedDate]: Date.now() }));
      
      if (availableSlots.length === 0) {
        setError('No slots available for this date');
      }

      // Log debug information if available
      if (response.debug) {
        console.log('Debug info:', response.debug);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch slots. Please try again.');
      // Clear slots if there's an error
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    }
  };

  // Add effect to refresh slots when current time changes
  useEffect(() => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      
      // Only refresh if viewing today's slots
      if (formattedDate === todayStr) {
        const currentSlots = slots;
        const filteredSlots = filterPassedSlots(currentSlots);
        
        // Update slots if any were filtered out
        if (filteredSlots.length !== currentSlots.length) {
          setSlots(filteredSlots);
          
          // Clear selected slot if it was filtered out
          if (selectedSlot && !filteredSlots.find(s => s._id === selectedSlot._id)) {
            setSelectedSlot(null);
          }
        }
      }
    }
  }, [currentTime, selectedDate]);

  const fetchBookings = async (formattedDate: string) => {
    try {
      setIsLoadingBookings(true);
      
      const data = await fetchWithTimeout(`/api/bookings?date=${formattedDate}`);
      const bookingsData = Array.isArray(data) ? data : [];
      
      setBookingsCache(prev => ({ ...prev, [formattedDate]: bookingsData }));
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError('Failed to fetch bookings. Please try again.');
      setBookings([]);
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
    if (!bookings || !slots) return 0;

    // Filter out bookings with null slotId
    const validBookings = bookings.filter(booking => booking.slotId && booking.slotId._id);
    
    const bookedCount = validBookings.filter(
      (booking) =>
        booking.slotId._id === slotId &&
        booking.status === 'confirmed'
    ).length;

    const slot = slots.find((s) => s._id === slotId);
    if (!slot) return 0;

    return slot.totalCapacity - bookedCount;
  };

  const handleBooking = async () => {
    if (!selectedSlot) {
      toast.error('Please select a slot');
      return;
    }

    try {
      setLoading(true);

      // Check if slot exists and has capacity
      const availableSlots = getAvailableSlots(selectedSlot._id);
      if (availableSlots <= 0) {
        toast.error('This slot is fully booked');
        return;
      }

      // Create payment order
      const orderData = await createPaymentOrder({
        amount: selectedSlot.price * 100, // Convert to paise
        currency: 'INR',
        notes: {
          slotId: selectedSlot._id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedSlot.time,
        },
      });

      if (!orderData?.key || !orderData?.orderId) {
        throw new Error('Failed to create payment order');
      }

      // Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error('Failed to load Razorpay script');
      }

      // Initialize payment
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Turf 106',
        description: `Booking for ${format(selectedDate, 'dd MMM yyyy')} at ${formatTime(selectedSlot.time)}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Create booking
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

            const bookingData = await bookingResponse.json();

            if (!bookingResponse.ok) {
              throw new Error(bookingData.message || 'Failed to create booking');
            }

            toast.success('Booking confirmed!');
            router.push('/bookings');
          } catch (error) {
            console.error('Booking creation error:', error);
            toast.error('Failed to confirm booking. Please contact support.');
          }
        },
        prefill: {
          email: user?.emailAddresses?.[0]?.emailAddress || '',
          contact: '',
        },
        theme: {
          color: '#16a34a',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Failed to initialize payment'
      );
    } finally {
      setLoading(false);
    }
  };

  // Add loading state for user profile
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

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

      {/* Add a timestamp display for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-white p-2 rounded shadow text-xs">
          Current time: {currentTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
} 