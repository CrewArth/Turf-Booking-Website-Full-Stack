import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import Razorpay from 'razorpay';
import { NextRequest } from 'next/server';

// Set maximum duration for the API route
export const maxDuration = 30; // 30 seconds timeout

// Initialize Razorpay with proper error handling
function initializeRazorpay() {
  // Log all available environment variables (without exposing secrets)
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
    hasNextPublicRazorpayKeyId: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
  };
  console.log('Environment variables check:', envVars);

  // Get credentials with fallbacks
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const public_key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // Log credential availability
  console.log('Razorpay Configuration Status:', {
    hasKeyId: !!key_id,
    hasKeySecret: !!key_secret,
    hasPublicKey: !!public_key,
    environment: process.env.NODE_ENV,
    keyIdLength: key_id?.length,
    keySecretLength: key_secret?.length
  });

  if (!key_id || !key_secret) {
    throw new Error(`Razorpay credentials missing: ${!key_id ? 'KEY_ID ' : ''}${!key_secret ? 'KEY_SECRET' : ''}`);
  }

  try {
    const instance = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    // Test the instance
    if (!instance || !instance.orders) {
      throw new Error('Razorpay instance creation failed');
    }

    console.log('Razorpay initialized successfully');
    return instance;
  } catch (error) {
    console.error('Razorpay initialization error:', error);
    throw new Error(`Failed to initialize payment service: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get auth using server-side method
    const session = auth();
    const userId = session.userId;
    
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
    let razorpay;
    try {
      razorpay = initializeRazorpay();
    } catch (error) {
      console.error('Failed to initialize Razorpay:', error);
      return NextResponse.json(
        {
          error: 'Payment service initialization failed',
          message: error instanceof Error ? error.message : 'Unable to initialize payment service',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        },
        { status: 500 }
      );
    }

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
    const orderAmount = Math.round(amount); // Convert to paise
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

    console.log('Creating Razorpay order with options:', {
      amount: orderAmount,
      currency,
      hasNotes: !!notes,
      environment: process.env.NODE_ENV,
      userId: userId
    });

    // Create order
    const order = await razorpay.orders.create(orderOptions);
    
    // Get the appropriate key for client
    const clientKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!clientKey) {
      throw new Error('Razorpay public key is not configured');
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: clientKey
    });
  } catch (error) {
    console.error('Payment order creation failed:', error);

    // Handle specific error cases
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('credentials') || errorMessage.includes('initialize') || errorMessage.includes('configured')) {
        return NextResponse.json(
          {
            error: 'Payment service configuration error',
            message: 'The payment service is not properly configured. Please check your environment variables.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }
      
      if (errorMessage.includes('auth') || errorMessage.includes('key') || errorMessage.includes('invalid key')) {
        return NextResponse.json(
          {
            error: 'Payment service authentication failed',
            message: 'Unable to authenticate with payment service. Please check your Razorpay credentials.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Payment creation failed',
        message: 'Failed to create payment order. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 