import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Razorpay from 'razorpay';
import { NextRequest } from 'next/server';

// Set maximum duration for the API route
export const maxDuration = 30; // 30 seconds timeout

// Initialize Razorpay with proper error handling
function initializeRazorpay() {
  const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials are not configured');
  }

  try {
    return new Razorpay({
      key_id,
      key_secret,
    });
  } catch (error) {
    console.error('Failed to initialize Razorpay:', error);
    throw new Error('Failed to initialize payment service');
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get auth using server-side method
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in to create an order'
        },
        { status: 401 }
      );
    }

    // Initialize Razorpay for this request
    const razorpay = initializeRazorpay();

    // Get and validate request body
    const body = await req.json();
    const { amount, currency = 'INR', notes = {} } = body;

    // Validate amount
    if (!amount || amount < 1) {
      return NextResponse.json(
        {
          error: 'Invalid amount',
          message: 'Amount must be greater than 0'
        },
        { status: 400 }
      );
    }

    // Create order options
    const orderAmount = Math.round(amount * 100); // Convert to paise
    const orderOptions = {
      amount: orderAmount,
      currency,
      notes: {
        ...notes,
        userId,
        environment: process.env.NODE_ENV || 'production'
      },
      payment_capture: 1,
    };

    // Create order
    const order = await razorpay.orders.create(orderOptions);
    
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Payment order creation failed:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('credentials') || errorMessage.includes('initialize')) {
        return NextResponse.json(
          {
            error: 'Payment service configuration error',
            message: 'The payment service is not properly configured'
          },
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('auth') || errorMessage.includes('key') || errorMessage.includes('invalid key')) {
        return NextResponse.json(
          {
            error: 'Payment service authentication failed',
            message: 'Unable to authenticate with payment service'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Payment creation failed',
        message: 'Failed to create payment order'
      },
      { status: 500 }
    );
  }
} 