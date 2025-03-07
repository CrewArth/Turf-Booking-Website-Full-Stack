import Razorpay from 'razorpay';

// Only initialize Razorpay instance on the server
const isServer = typeof window === 'undefined';
export const razorpay = isServer ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
}) : null;

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    // Check if Razorpay is already loaded
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    
    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.error('Razorpay script load timeout');
      resolve(false);
    }, 10000);

    script.onload = () => {
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = (error) => {
      clearTimeout(timeoutId);
      console.error('Failed to load Razorpay script:', error);
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

    // Ensure amount is a number
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Failed to create payment order');
    }

    // Validate response data
    if (!data.orderId || !data.amount || !data.key) {
      console.error('Invalid order response:', data);
      throw new Error('Invalid order response from server');
    }

    return data;
  } catch (error) {
    console.error('Payment order creation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      options
    });
    throw error;
  }
} 