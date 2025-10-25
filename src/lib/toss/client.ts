import type { TossPaymentConfirmRequest } from '@/types/payment';

const TOSS_API_BASE_URL = 'https://api.tosspayments.com/v1';

/**
 * Get authorization header for Toss Payments API
 */
function getAuthHeader(): string {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY!;
  const encoded = Buffer.from(`${secretKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Confirm payment with Toss Payments API
 * @param data - Payment confirmation data (paymentKey, orderId, amount)
 * @returns Payment confirmation response
 */
export async function confirmPayment(
  data: TossPaymentConfirmRequest
): Promise<any> {
  const response = await fetch(`${TOSS_API_BASE_URL}/payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Toss Payments error: ${error.message || 'Unknown error'}`);
  }

  return response.json();
}

export interface PayWithBillingKeyParams {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}

/**
 * Pay with billing key (recurring payment)
 * @param params - Billing key payment parameters
 * @returns Payment response
 */
export async function payWithBillingKey(
  params: PayWithBillingKeyParams
): Promise<any> {
  const response = await fetch(
    `${TOSS_API_BASE_URL}/billing/${params.billingKey}`,
    {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Toss Payments billing error: ${error.message || 'Unknown error'}`
    );
  }

  return response.json();
}

/**
 * Delete billing key
 * @param billingKey - Billing key to delete
 */
export async function deleteBillingKey(billingKey: string): Promise<void> {
  const response = await fetch(
    `${TOSS_API_BASE_URL}/billing/authorizations/issue`,
    {
      method: 'DELETE',
      headers: {
        Authorization: getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ billingKey }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Toss Payments delete billing key error: ${error.message || 'Unknown error'}`
    );
  }
}
