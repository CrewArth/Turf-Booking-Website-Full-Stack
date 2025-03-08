import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function GET(req: Request) {
  const startTime = Date.now();
  
  try {
    console.log('Testing slots query...');
    await dbConnect();
    
    // Get all slots with full projection
    const allSlots = await Slot.find().lean();
    
    // Group slots by date for easier viewing
    const slotsByDate = allSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push({
        time: slot.time,
        isEnabled: slot.isEnabled,
        price: slot.price,
        totalCapacity: slot.totalCapacity,
        isNight: slot.isNight,
        id: slot._id,
        date: slot.date // Include date for verification
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    // Get some statistics
    const dates = Object.keys(slotsByDate).sort();
    const enabledSlots = allSlots.filter(s => s.isEnabled).length;
    const disabledSlots = allSlots.length - enabledSlots;
    
    const endTime = Date.now();
    
    return NextResponse.json({
      success: true,
      stats: {
        totalSlots: allSlots.length,
        enabledSlots,
        disabledSlots,
        uniqueDates: dates,
        dateCount: dates.length
      },
      slotsByDate,
      sampleSlot: allSlots[0] || null,
      queryTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Slots test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 