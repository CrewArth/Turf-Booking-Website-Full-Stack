import Razorpay from 'razorpay';

// Only initialize Razorpay instance on the server
const isServer = typeof window === 'undefined';
export const razorpay = isServer ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
}) : null;

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
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
    const response = await fetch('/api/payments/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment order');
    }

    return await response.json();
  } catch (error) {
    console.error('Payment order creation failed:', error);
    throw error;
  }
} 