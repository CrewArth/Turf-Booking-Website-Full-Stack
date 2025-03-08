import Razorpay from 'razorpay';

// Only initialize Razorpay instance on the server
const isServer = typeof window === 'undefined';

// Validate Razorpay keys
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_P87vWqcCvdKNLm';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '35itOlQ0L6EcH5C9KGAx08VE';

export const razorpay = isServer ? new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
}) : null;

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('Attempting to load Razorpay script...');

    if (typeof window === 'undefined') {
      console.log('Script loading skipped - running on server');
      resolve(false);
      return;
    }

    // Check if Razorpay is already loaded
    if ((window as any).Razorpay) {
      console.log('Razorpay script already loaded');
      resolve(true);
      return;
    }

    console.log('Creating Razorpay script element...');
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error('Razorpay script load timeout after 10 seconds');
      resolve(false);
    }, 10000);

    script.onload = () => {
      console.log('Razorpay script loaded successfully');
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Razorpay script:', {
        error,
        src: script.src,
        timestamp: new Date().toISOString()
      });
      clearTimeout(timeoutId);
      resolve(false);
    };

    console.log('Appending Razorpay script to document...');
    document.body.appendChild(script);
  });
}

export interface PaymentOptions {
  amount: number;
  currency?: string;
  notes?: Record<string, string>;
}

export async function createPaymentOrder(options: PaymentOptions) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Creating payment order...`, {
    options,
    timestamp: new Date().toISOString()
  });

  try {
    // Validate amount
    if (!options.amount || options.amount < 1) {
      console.error(`[${requestId}] Invalid amount:`, options.amount);
      throw new Error('Invalid amount. Amount must be greater than 0.');
    }

    // Ensure amount is a number
    const amount = Number(options.amount);
    if (isNaN(amount)) {
      console.error(`[${requestId}] Invalid amount format:`, options.amount);
      throw new Error('Invalid amount format');
    }

    console.log(`[${requestId}] Sending request to create order...`);
    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...options,
        amount: amount,
      }),
    });

    console.log(`[${requestId}] Order creation response status:`, response.status);
    const data = await response.json();
    console.log(`[${requestId}] Order creation response:`, data);

    if (!response.ok) {
      console.error(`[${requestId}] Order creation failed:`, {
        status: response.status,
        data
      });
      throw new Error(data.message || data.error || 'Failed to create payment order');
    }

    // Validate response data
    if (!data.orderId || !data.amount || !data.key) {
      console.error(`[${requestId}] Invalid order response:`, data);
      throw new Error('Invalid order response from server');
    }

    console.log(`[${requestId}] Order created successfully:`, {
      orderId: data.orderId,
      amount: data.amount
    });

    return data;
  } catch (error) {
    console.error(`[${requestId}] Payment order creation failed:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      options
    });
    throw error;
  }
} 