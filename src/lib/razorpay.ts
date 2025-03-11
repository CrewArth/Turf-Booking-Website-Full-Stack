import Razorpay from 'razorpay';
import crypto from 'crypto';

// Only initialize Razorpay instance on the server
const isServer = typeof window === 'undefined';

// Validate and get Razorpay keys with better error handling
function getRazorpayCredentials() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  const public_key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Razorpay Credentials Check:', {
      hasKeyId: !!key_id,
      hasKeySecret: !!key_secret,
      hasPublicKey: !!public_key,
      environment: process.env.NODE_ENV,
      keyIdLength: key_id?.length,
      keySecretLength: key_secret?.length
    });
  }

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials are missing. Please check your environment variables.');
  }

  return { key_id, key_secret, public_key };
}

// Initialize Razorpay only on server
export const razorpay = isServer ? (() => {
  try {
    const { key_id, key_secret } = getRazorpayCredentials();
    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    // Test the instance
    if (!instance || !instance.orders) {
      throw new Error('Razorpay instance creation failed');
    }

    return instance;
  } catch (error) {
    console.error('Failed to initialize Razorpay:', error);
    return null;
  }
})() : null;

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
      console.error('Failed to load Razorpay script');
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

    // Check if public key is available
    const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!publicKey) {
      console.error('Razorpay public key is not configured');
    }

    // Log request details (without sensitive info)
    console.log('Creating payment order:', {
      amount,
      currency: options.currency,
      hasNotes: !!options.notes,
      environment: process.env.NODE_ENV,
      hasPublicKey: !!publicKey
    });

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
      console.error('Payment order creation failed:', {
        status: response.status,
        error: data.error,
        message: data.message,
        details: data.details
      });
      throw new Error(data.message || data.error || 'Failed to create payment order');
    }

    // Validate response data
    if (!data.orderId || !data.amount || !data.key) {
      console.error('Invalid order response:', {
        hasOrderId: !!data.orderId,
        hasAmount: !!data.amount,
        hasKey: !!data.key,
        responseData: data
      });
      throw new Error('Invalid order response from server');
    }

    return data;
  } catch (error) {
    console.error('Payment order creation failed:', error);
    throw error;
  }
}

interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export const verifyRazorpayPayment = ({ orderId, paymentId, signature }: VerifyPaymentParams): boolean => {
  try {
    // Get the secret key from environment variables
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error('RAZORPAY_KEY_SECRET is not defined');
      return false;
    }

    // Create the signature verification string
    const verificationString = `${orderId}|${paymentId}`;

    // Create an HMAC SHA256 hash using the secret
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(verificationString);
    const generatedSignature = hmac.digest('hex');

    // Compare the generated signature with the received signature
    return generatedSignature === signature;
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return false;
  }
}; 