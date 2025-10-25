import { z } from 'zod';

export const paymentConfirmSchema = z.object({
  paymentKey: z.string().min(1, '결제 키가 필요합니다'),
  orderId: z.string().min(1, '주문 ID가 필요합니다'),
  amount: z.number().int().positive('금액은 양수여야 합니다'),
});

export type PaymentConfirmInput = z.infer<typeof paymentConfirmSchema>;
