# Implementation Plan: Payment Success Page

## 1. Overview

- **Purpose**: Handle successful payment callback from Toss Payments, confirm payment, and display success message
- **Route**: `/payment/success`
- **Auth**: Required
- **Related Usecases**: UC-004 (Pro 요금제 업그레이드) - Success flow

## 2. File Structure

```
src/app/payment/success/
├── page.tsx                    # Client Component (handle query params, call API)
└── components/
    └── SuccessMessage.tsx      # Client Component (success UI)
```

## 3. Components Breakdown

### 3.1 Client Components

**page.tsx** (Main Success Page)
- **Type**: Client Component (needs to read search params and call API)
- **Purpose**: Receive payment callback, confirm payment, show success message
- **Query Params** (from Toss Payments):
  - `paymentKey`: Payment key
  - `orderId`: Order ID
  - `amount`: Payment amount
- **Flow**:
  ```tsx
  'use client';

  import { useSearchParams, useRouter } from 'next/navigation';
  import { useEffect, useState } from 'react';

  export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
      const confirmPayment = async () => {
        try {
          const paymentKey = searchParams.get('paymentKey');
          const orderId = searchParams.get('orderId');
          const amount = searchParams.get('amount');

          if (!paymentKey || !orderId || !amount) {
            throw new Error('Missing payment parameters');
          }

          const response = await fetch('/api/payments/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentKey,
              orderId,
              amount: Number(amount),
            }),
          });

          if (!response.ok) {
            throw new Error('Payment confirmation failed');
          }

          const data = await response.json();
          setStatus('success');

          // Start countdown
          const interval = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(interval);
                router.push('/dashboard');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

        } catch (error) {
          console.error('Payment confirmation error:', error);
          setStatus('error');
        }
      };

      confirmPayment();
    }, [searchParams, router]);

    if (status === 'loading') {
      return <Loading message="결제를 확인하는 중..." />;
    }

    if (status === 'error') {
      return <ErrorMessage message="결제 승인에 실패했습니다. 고객센터로 문의해주세요." />;
    }

    return <SuccessMessage countdown={countdown} />;
  }
  ```

**SuccessMessage.tsx**
- **Type**: Client Component
- **Purpose**: Display success message and countdown
- **Props**:
  ```tsx
  interface SuccessMessageProps {
    countdown: number;
  }
  ```
- **Display**:
  ```tsx
  <div className="flex flex-col items-center justify-center min-h-screen">
    <CheckCircle className="w-16 h-16 text-green-500" />
    <h1 className="text-2xl font-bold mt-4">Pro 요금제 구독이 완료되었습니다!</h1>
    <div className="mt-6 text-center">
      <p>월 10회 분석</p>
      <p>Gemini 2.5 Pro 모델 사용</p>
      <p>3,900원/월</p>
    </div>
    <p className="mt-6 text-gray-500">
      {countdown}초 후 대시보드로 이동합니다...
    </p>
    <Button onClick={() => router.push('/dashboard')} className="mt-4">
      대시보드로 이동
    </Button>
  </div>
  ```

### 3.2 Reusable Components from `/src/components/`

- `/src/components/ui/button.tsx` - CTA button
- `/src/components/common/Loading.tsx` - Loading state
- `/src/components/common/ErrorMessage.tsx` - Error display
- `lucide-react` - CheckCircle icon

## 4. API Integration

### 4.1 Payment Confirmation API

**Endpoint**: `POST /api/payments/confirm` (already created in 006)

**Request**:
```tsx
await fetch('/api/payments/confirm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentKey: string,
    orderId: string,
    amount: number,
  }),
});
```

**Response**:
```json
{
  "success": true,
  "subscriptionEndsAt": "2025-11-25T10:00:00Z"
}
```

### 4.2 Error Handling Strategy

**Missing Query Params**:
```tsx
if (!paymentKey || !orderId || !amount) {
  setStatus('error');
  toast.error('잘못된 결제 정보입니다.');
}
```

**API Call Error**:
```tsx
try {
  const response = await fetch('/api/payments/confirm', ...);
  if (!response.ok) throw new Error('Confirmation failed');
} catch (error) {
  setStatus('error');
  toast.error('결제 승인에 실패했습니다. 고객센터로 문의해주세요.');
}
```

**Duplicate Confirmation**:
- API returns `PAYMENT_ALREADY_PROCESSED` → still show success

## 5. Data Flow

### 5.1 Success Flow

```
1. Toss Payments redirects to /payment/success?paymentKey=xxx&orderId=yyy&amount=3900
2. page.tsx (Client Component):
   a. Extract query params
   b. Validate params exist
   c. Call POST /api/payments/confirm
   d. API confirms payment with Toss, saves to DB, updates user
3. API returns success
4. Show SuccessMessage with countdown
5. After 3 seconds, redirect to /dashboard
```

### 5.2 Error Flow

```
1. If query params missing: Show error immediately
2. If API call fails: Show error with retry option
3. User can manually click "대시보드로 이동" at any time
```

## 6. Validation

### 6.1 Client-side Validation

- Check query params exist
- Check amount is a valid number

### 6.2 Server-side Validation

- Handled in `/api/payments/confirm` (already implemented in 006)

### 6.3 Error Message Display

- **Missing params**: "잘못된 결제 정보입니다."
- **API error**: "결제 승인에 실패했습니다. 고객센터로 문의해주세요."
- **Network error**: "네트워크 오류가 발생했습니다. 다시 시도해주세요."

## 7. UI Components

### 7.1 shadcn/ui Components

- `Button` - "대시보드로 이동"
- `CheckCircle` (lucide-react) - Success icon

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4">
  <div className="flex flex-col items-center justify-center min-h-screen">
    <CheckCircle />
    <h1>구독 완료!</h1>
    <BenefitsList />
    <Countdown />
    <Button>대시보드로 이동</Button>
  </div>
</main>
```

### 7.3 Responsive Design

- Center-aligned content
- Works on all screen sizes

## 8. Implementation Checklist

- [ ] Create `src/app/payment/success/page.tsx` (Client Component)
- [ ] Create `src/app/payment/success/components/SuccessMessage.tsx`
- [ ] Extract query params from URL
- [ ] Call `/api/payments/confirm` API
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Implement countdown timer (3s)
- [ ] Auto-redirect to dashboard
- [ ] Add manual "대시보드로 이동" button
- [ ] Test success flow end-to-end
- [ ] Test error handling (missing params, API error)

## 9. Performance Optimizations

- Use Client Component (required for query params)
- Immediate API call on mount (no delay)

## 10. Accessibility

- Semantic HTML (h1, main)
- ARIA labels for icons
- Focus on button after countdown
- Screen reader announcements for countdown

## 11. Testing Scenarios

### 11.1 Success Tests

- [ ] Valid payment: Show success message, countdown, redirect
- [ ] Click "대시보드로 이동" before countdown: Immediate redirect
- [ ] Duplicate confirmation: Still show success

### 11.2 Error Tests

- [ ] Missing paymentKey: Show error
- [ ] Missing orderId: Show error
- [ ] Missing amount: Show error
- [ ] API call fails: Show error
- [ ] Invalid amount: API returns error

## 12. Edge Cases

- **Page refresh**: Re-confirms payment (API handles duplicate)
- **Back button**: User can go back but payment already confirmed
- **Multiple tabs**: Each tab confirms independently (API handles duplicate)
- **Network error**: Show error, allow manual navigation

## 13. Dependencies

### 13.1 External Libraries

- `lucide-react` - CheckCircle icon
- `next/navigation` - useSearchParams, useRouter

### 13.2 Internal Dependencies

- `/src/app/api/payments/confirm/route.ts` - Payment confirmation API
- `/src/components/ui/button.tsx`
- `/src/components/common/Loading.tsx`
- `/src/components/common/ErrorMessage.tsx`

## 14. Future Enhancements (Out of Scope)

- Email confirmation receipt
- Download invoice
- Share subscription success
- Confetti animation

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx and SuccessMessage component
