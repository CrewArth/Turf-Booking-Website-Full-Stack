import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function GET(req: Request) {
  const startTime = Date.now();
  
  try {
    console.log('Testing slots query...');
    await dbConnect();
    
    // Get all slots with minimal projection
    const allSlots = await Slot.find(
      {},
      { date: 1, time: 1, isEnabled: 1, _id: 1 }
    ).lean();
    
    // Group slots by date for easier viewing
    const slotsByDate = allSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push({
        time: slot.time,
        isEnabled: slot.isEnabled,
        id: slot._id
      });
      return acc;
    }, {} as Record<string, any[]>);
    
    const endTime = Date.now();
    
    return NextResponse.json({
      success: true,
      totalSlots: allSlots.length,
      slotsByDate,
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