import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Razorpay from 'razorpay';
import { NextRequest } from 'next/server';

// Set maximum duration for the API route
export const maxDuration = 30; // 30 seconds timeout

// Initialize Razorpay with error handling
let razorpay: Razorpay | null = null;

try {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('Missing Razorpay credentials in environment variables');
  } else {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('Razorpay initialized successfully');
  }
} catch (error) {
  console.error('Failed to initialize Razorpay:', error);
}

export async function POST(req: NextRequest) {
  console.log('Payment order creation request received');
  const startTime = Date.now();

  try {
    // Validate Razorpay initialization
    if (!razorpay) {
      console.error('Razorpay not initialized');
      return NextResponse.json(
        {
          error: 'Payment service unavailable',
          message: 'Payment service is not properly configured'
        },
        { status: 503 }
      );
    }

    // Get auth using server-side method
    const { userId } = getAuth(req);
    console.log('User authentication:', { userId, authenticated: !!userId });
    
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in to create an order'
        },
        { status: 401 }
      );
    }

    // Get and validate request body
    const body = await req.json();
    console.log('Request body:', {
      ...body,
      timestamp: new Date().toISOString()
    });

    const { amount, currency = 'INR', notes = {} } = body;

    // Validate amount
    if (!amount || amount < 1) {
      console.log('Invalid amount provided:', amount);
      return NextResponse.json(
        {
          error: 'Invalid amount',
          message: 'Amount must be greater than 0'
        },
        { status: 400 }
      );
    }

    // Create order options
    const orderOptions = {
      amount: Math.round(amount * 100), // Convert to paise and ensure it's an integer
      currency,
      notes: {
        ...notes,
        userId,
      },
      payment_capture: 1, // Auto capture payment
    };

    console.log('Creating Razorpay order with options:', orderOptions);

    // Create order
    const order = await razorpay.orders.create(orderOptions);
    
    console.log('Order created successfully:', {
      orderId: order.id,
      amount: order.amount,
      executionTime: Date.now() - startTime
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error('Payment order creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: errorTime,
      timestamp: new Date().toISOString()
    });

    // Check for specific Razorpay errors
    if (error instanceof Error) {
      if (error.message.includes('auth') || error.message.includes('key')) {
        return NextResponse.json(
          {
            error: 'Payment service authentication failed',
            message: 'Unable to authenticate with payment service'
          },
          { status: 500 }
        );
      }
      if (error.message.includes('amount')) {
        return NextResponse.json(
          {
            error: 'Invalid amount',
            message: 'The payment amount is invalid'
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to create payment order',
        message: 'An unexpected error occurred while creating your order',
        details: process.env.NODE_ENV === 'development' ?
          (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    );
  }
} 