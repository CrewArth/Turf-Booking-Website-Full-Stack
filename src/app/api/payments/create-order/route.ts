import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import Razorpay from 'razorpay';
import { NextRequest } from 'next/server';

// Set maximum duration for the API route
export const maxDuration = 30; // 30 seconds timeout

// Razorpay keys
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_P87vWqcCvdKNLm';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '35itOlQ0L6EcH5C9KGAx08VE';
const NEXT_PUBLIC_RAZORPAY_KEY_ID = RAZORPAY_KEY_ID;

// Initialize Razorpay with error handling
let razorpay: Razorpay | null = null;

function initializeRazorpay() {
  console.log('Initializing Razorpay...');

  if (razorpay) {
    console.log('Using existing Razorpay instance');
    return razorpay;
  }

  try {
    console.log('Creating new Razorpay instance with key:', RAZORPAY_KEY_ID);
    razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    console.log('Razorpay instance created successfully');
    return razorpay;
  } catch (error) {
    console.error('Razorpay initialization error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Payment order creation request received`);
  const startTime = Date.now();

  try {
    // Initialize Razorpay for each request
    console.log(`[${requestId}] Initializing Razorpay...`);
    const razorpayInstance = initializeRazorpay();
    
    // Validate Razorpay initialization
    if (!razorpayInstance) {
      console.error(`[${requestId}] Razorpay initialization failed`);
      return NextResponse.json(
        {
          error: 'Payment service unavailable',
          message: 'Payment service is not properly configured',
          requestId
        },
        { status: 503 }
      );
    }

    // Get auth using server-side method
    console.log(`[${requestId}] Verifying user authentication...`);
    const { userId } = getAuth(req);
    console.log(`[${requestId}] User authentication:`, { userId, authenticated: !!userId });
    
    if (!userId) {
      console.error(`[${requestId}] Authentication failed - no user ID`);
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please sign in to create an order',
          requestId
        },
        { status: 401 }
      );
    }

    // Get and validate request body
    console.log(`[${requestId}] Parsing request body...`);
    const body = await req.json();
    console.log(`[${requestId}] Request body:`, {
      ...body,
      timestamp: new Date().toISOString()
    });

    const { amount, currency = 'INR', notes = {} } = body;

    // Validate amount
    console.log(`[${requestId}] Validating amount:`, amount);
    if (!amount || amount < 1) {
      console.error(`[${requestId}] Invalid amount provided:`, amount);
      return NextResponse.json(
        {
          error: 'Invalid amount',
          message: 'Amount must be greater than 0',
          requestId
        },
        { status: 400 }
      );
    }

    // Create order options
    const orderAmount = Math.round(amount * 100); // Convert to paise
    console.log(`[${requestId}] Preparing order options:`, {
      originalAmount: amount,
      convertedAmount: orderAmount,
      currency
    });

    const orderOptions = {
      amount: orderAmount,
      currency,
      notes: {
        ...notes,
        userId,
        environment: process.env.NODE_ENV || 'production',
        requestId
      },
      payment_capture: 1,
    };

    console.log(`[${requestId}] Creating Razorpay order with options:`, orderOptions);

    // Create order
    console.log(`[${requestId}] Calling Razorpay API...`);
    const order = await razorpayInstance.orders.create(orderOptions);
    
    console.log(`[${requestId}] Order created successfully:`, {
      orderId: order.id,
      amount: order.amount,
      executionTime: Date.now() - startTime
    });

    const response = {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: NEXT_PUBLIC_RAZORPAY_KEY_ID,
      requestId
    };

    console.log(`[${requestId}] Sending successful response:`, response);
    return NextResponse.json(response);
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[${requestId}] Payment order creation failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      executionTime: errorTime,
      timestamp: new Date().toISOString()
    });

    // Check for specific Razorpay errors
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      console.log(`[${requestId}] Analyzing error message:`, errorMessage);

      if (errorMessage.includes('auth') || errorMessage.includes('key') || errorMessage.includes('invalid key')) {
        return NextResponse.json(
          {
            error: 'Payment service authentication failed',
            message: 'Unable to authenticate with payment service',
            details: error.message,
            requestId
          },
          { status: 500 }
        );
      }
      if (errorMessage.includes('amount')) {
        return NextResponse.json(
          {
            error: 'Invalid amount',
            message: 'The payment amount is invalid',
            requestId
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to create payment order',
        message: 'An unexpected error occurred while creating your order',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      { status: 500 }
    );
  }
} 