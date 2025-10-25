// Payment-related types for Toss Payments integration

// Payment status
export type PaymentStatus = 'done' | 'cancelled' | 'failed';

// Payment information (Database type)
export interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  payment_key: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

// Billing key information
export interface BillingKey {
  id: string;
  user_id: string;
  billing_key: string;
  created_at: string;
}

// Toss Payments confirm request
export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}
