import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';
import { addDays, format, parse, setHours, setMinutes, isBefore, isEqual } from 'date-fns';

interface TimeSlot {
  date: string;
  time: string;
  price: number;
  isNight: boolean;
  totalCapacity: number;
  isEnabled: boolean;
}

function generateTimeSlots(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
  interval: number,
  price: number,
  capacity: number
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  while (currentDate <= lastDate) {
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    
    // Create base time for current date
    let currentTimeObj = new Date(currentDate);
    currentTimeObj = setHours(currentTimeObj, startHour);
    currentTimeObj = setMinutes(currentTimeObj, startMinute);

    // Create end time - if end time is 00:00, set it to 23:59 of the same day
    let endTimeObj = new Date(currentDate);
    if (endHour === 0 && endMinute === 0) {
      endTimeObj = setHours(endTimeObj, 23);
      endTimeObj = setMinutes(endTimeObj, 59);
    } else {
      endTimeObj = setHours(endTimeObj, endHour);
      endTimeObj = setMinutes(endTimeObj, endMinute);

      // If end time is less than start time, it means it's for the next day
      if (endTimeObj < currentTimeObj) {
        endTimeObj = addDays(endTimeObj, 1);
      }
    }

    // Generate slots while current time is before or equal to end time
    while (isBefore(currentTimeObj, endTimeObj) || isEqual(currentTimeObj, endTimeObj)) {
      const hour = currentTimeObj.getHours();
      const isNight = hour >= 18 || hour < 6; // 6 PM to 6 AM is considered night

      slots.push({
        date: formattedDate,
        time: format(currentTimeObj, 'HH:mm'),
        price,
        isNight,
        totalCapacity: capacity,
        isEnabled: true
      });

      // Add interval minutes
      currentTimeObj = new Date(currentTimeObj.getTime() + interval * 60000);
    }

    currentDate = addDays(currentDate, 1);
  }

  return slots;
}

export async function POST(req: Request) {
  try {
    // Check for admin token in cookies
    const cookies = req.headers.get('cookie');
    const hasAdminToken = cookies?.includes('admin_token=true');

    if (!hasAdminToken) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();
    const { startDate, endDate, startTime, endTime, interval, price, capacity } = data;

    // Validate input
    if (!startDate || !endDate || !startTime || !endTime || !interval || !price || !capacity) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'Please provide startDate, endDate, startTime, endTime, interval, price, and capacity'
      }, { status: 400 });
    }

    // Additional validation for interval
    if (interval < 30 || interval > 180) {
      return NextResponse.json({
        error: 'Invalid interval',
        details: 'Interval must be between 30 and 180 minutes'
      }, { status: 400 });
    }

    console.log('Generating slots with params:', {
      startDate,
      endDate,
      startTime,
      endTime,
      interval,
      price,
      capacity
    });

    // Generate time slots
    const timeSlots = generateTimeSlots(startDate, endDate, startTime, endTime, interval, price, capacity);

    console.log(`Generated ${timeSlots.length} slots`);

    // Create slots in database
    const results = await Promise.all(
      timeSlots.map(async (slot) => {
        try {
          // Check if slot already exists
          const existingSlot = await Slot.findOne({
            date: slot.date,
            time: slot.time
          });

          if (!existingSlot) {
            const newSlot = await Slot.create(slot);
            return { status: 'created', slot: newSlot };
          }
          return { status: 'exists', slot: existingSlot };
        } catch (error) {
          console.error('Error creating slot:', error);
          return { status: 'error', error };
        }
      })
    );

    const created = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      message: `Created ${created} slots successfully. ${existing} slots already existed. ${errors} slots failed.`,
      details: {
        created,
        existing,
        errors,
        totalAttempted: timeSlots.length,
        generatedSlots: timeSlots.map(slot => ({
          date: slot.date,
          time: slot.time,
          isNight: slot.isNight
        }))
      }
    });
  } catch (error) {
    console.error('Error creating slots:', error);
    return NextResponse.json({
      error: 'Failed to create slots',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 