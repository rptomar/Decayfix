import Razorpay from 'razorpay';
import { DEFAULT_PRICE_INR } from './constants';

export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.startsWith('rzp_test_dummy')) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Creates a Razorpay Order for one-time report unlock
 */
export async function createRazorpayOrder(params: {
  userId: string;
  siteId?: string;
  receiptId: string;
  amountInInr?: number;
}) {
  const rzp = getRazorpayClient();
  const amountInInr = params.amountInInr || Number(process.env.ONE_TIME_PRICE_INR || DEFAULT_PRICE_INR);
  const amountInPaise = amountInInr * 100;

  if (!rzp) {
    // In dev / dummy mode, generate a mock order structure
    return {
      id: `order_dev_${Date.now()}`,
      amount: amountInPaise,
      currency: 'INR',
      receipt: params.receiptId,
      status: 'created',
      isMock: true,
    };
  }

  const order = await rzp.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: params.receiptId,
    notes: {
      userId: params.userId,
      siteId: params.siteId || 'all',
      product: 'DecayFix Full Site Report Unlock',
    },
  });

  return order;
}
