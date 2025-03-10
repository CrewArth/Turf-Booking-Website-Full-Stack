import Razorpay from 'razorpay';

// Only initialize Razorpay instance on the server
const isServer = typeof window === 'undefined';

// Validate Razorpay keys
const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('Missing Razorpay credentials');
}

// Initialize Razorpay only on server and only if credentials are available
export const razorpay = isServer && RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    })
  : null;

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
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

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    const timeoutId = setTimeout(() => {
      console.error('Razorpay script load timeout');
      resolve(false);
    }, 10000);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    document.body.appendChild(script);
  });
}

export interface PaymentOptions {
  amount: number;
  currency?: string;
  notes?: Record<string, string>;
}

export async function createPaymentOrder(options: PaymentOptions) {
  try {
    // Validate amount
    if (!options.amount || options.amount < 1) {
      throw new Error('Invalid amount. Amount must be greater than 0.');
    }

    const amount = Number(options.amount);
    if (isNaN(amount)) {
      throw new Error('Invalid amount format');
    }

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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to create payment order');
    }

    const data = await response.json();

    // Validate response data
    if (!data.orderId || !data.amount || !data.key) {
      throw new Error('Invalid order response from server');
    }

    return data;
  } catch (error) {
    console.error('Payment order creation failed:', error);
    throw error;
  }
} 