import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Slot } from '@/models/Slot';

export async function GET(req: Request) {
  const startTime = Date.now();
  
  try {
    console.log('Testing slots query...');
    await dbConnect();
    
    // Get all slots without any filters
    const allSlots = await Slot.find().lean();
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get slots for today
    const todaySlots = await Slot.find({
      date: today,
      isEnabled: true
    }).lean();

    // Get all unique dates that have slots
    const uniqueDates = await Slot.distinct('date');
    
    const endTime = Date.now();
    const queryTime = endTime - startTime;
    
    return NextResponse.json({
      success: true,
      stats: {
        totalSlots: allSlots.length,
        todaySlots: todaySlots.length,
        uniqueDates: uniqueDates,
        sampleSlot: allSlots[0] || null,
        queryTime: `${queryTime}ms`
      },
      message: 'Slots query successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Slots test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 