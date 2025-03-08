import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('Testing database connection...');
    await dbConnect();
    
    const endTime = Date.now();
    const connectionTime = endTime - startTime;
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connectionTime: `${connectionTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 