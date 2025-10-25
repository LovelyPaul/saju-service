# Implementation Plan: Subscription Upgrade Page

## 1. Overview

- **Purpose**: Allow Free Tier users to upgrade to Pro subscription via Toss Payments
- **Route**: `/subscription/upgrade`
- **Auth**: Required
- **Related Usecases**: UC-004 (Pro 요금제 업그레이드)

## 2. File Structure

```
src/app/subscription/upgrade/
├── page.tsx                    # Server Component (check if already Pro)
├── components/
│   ├── UpgradeCard.tsx        # Server Component (benefits display)
│   ├── PaymentWidget.tsx      # Client Component (Toss widget)
│   └── WarningBanner.tsx      # Server Component (no refund warning)
└── actions.ts                  # Server Actions (NOT used, use API route instead)
```

Additional API Route:
```
src/app/api/payments/
└── confirm/
    └── route.ts                # POST /api/payments/confirm
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Upgrade Page)
- **Type**: Server Component
- **Purpose**: Check if user is already Pro, render upgrade page
- **Data Fetching**:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getUserByClerkId } from '@/lib/supabase/queries';

  const { userId } = await auth();
  const user = await getUserByClerkId(supabase, userId);

  // Redirect if already Pro
  if (user.subscription_tier === 'pro' &&
      (!user.cancelled_at || new Date(user.subscription_ends_at) > new Date())) {
    redirect('/subscription'); // with toast: "이미 Pro 요금제를 사용 중입니다"
  }
  ```
- **Structure**:
  ```tsx
  <main>
    <h1>Pro 요금제로 업그레이드</h1>
    <UpgradeCard />
    <WarningBanner />
    <PaymentWidget user={user} />
  </main>
  ```

**UpgradeCard.tsx**
- **Type**: Server Component
- **Purpose**: Display Pro plan benefits
- **Props**: None
- **Display**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>Pro 요금제</h2>
      <Badge>Pro</Badge>
    </CardHeader>
    <CardContent>
      <ul>
        <li>월 10회 분석 (Free는 3회)</li>
        <li>Gemini 2.5 Pro 모델 사용 (더 상세한 분석)</li>
        <li>3,900원/월</li>
        <li>자동 정기결제</li>
      </ul>
    </CardContent>
  </Card>
  ```
- **Data**: Uses `/src/constants/app.ts` (SUBSCRIPTION constants)

**WarningBanner.tsx**
- **Type**: Server Component
- **Purpose**: Display no-refund warning
- **Props**: None
- **Display**:
  ```tsx
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>주의</AlertTitle>
    <AlertDescription>
      구독 후 환불이 불가합니다. 구독을 취소하면 다음 결제일까지 서비스 이용이 가능하며,
      이후 자동으로 무료 요금제로 전환됩니다.
    </AlertDescription>
  </Alert>
  ```

### 3.2 Client Components

**PaymentWidget.tsx**
- **Type**: Client Component
- **Purpose**: Render Toss Payments widget and handle payment
- **Props**:
  ```tsx
  interface PaymentWidgetProps {
    user: User;
  }
  ```
- **State**:
  ```tsx
  const [paymentWidget, setPaymentWidget] = useState<PaymentWidget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  ```
- **Widget Initialization**:
  ```tsx
  import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';

  useEffect(() => {
    const loadWidget = async () => {
      try {
        const widget = await loadPaymentWidget(
          process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY!,
          user.clerk_user_id // customerKey
        );

        widget.renderPaymentMethods('#payment-widget', {
          value: 3900,
          currency: 'KRW',
          country: 'KR',
        });

        setPaymentWidget(widget);
        setIsLoading(false);
      } catch (error) {
        setError('결제 위젯을 불러올 수 없습니다.');
        setIsLoading(false);
      }
    };

    loadWidget();
  }, [user.clerk_user_id]);
  ```
- **Payment Request**:
  ```tsx
  const handlePayment = async () => {
    if (!paymentWidget) return;

    try {
      await paymentWidget.requestPayment({
        orderId: crypto.randomUUID(),
        orderName: '사주 분석 서비스 Pro 구독',
        customerName: user.first_name || 'User',
        customerEmail: user.email,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error) {
      toast.error('결제 요청에 실패했습니다.');
    }
  };
  ```
- **Layout**:
  ```tsx
  <div>
    {isLoading && <Loading message="결제 위젯을 불러오는 중..." />}
    {error && <ErrorMessage message={error} />}
    <div id="payment-widget" />
    <Button onClick={handlePayment} disabled={!paymentWidget}>
      지금 업그레이드하기 (3,900원)
    </Button>
  </div>
  ```

### 3.3 Reusable Components from `/src/components/`

- `/src/components/ui/card.tsx` - UpgradeCard layout
- `/src/components/ui/badge.tsx` - Pro badge
- `/src/components/ui/button.tsx` - Payment button
- `/src/components/ui/alert.tsx` - Warning banner
- `/src/components/common/Loading.tsx` - Widget loading
- `/src/components/common/ErrorMessage.tsx` - Error display

## 4. API Integration

### 4.1 Toss Payments Widget SDK

**Install**:
```bash
npm install @tosspayments/payment-widget-sdk
```

**Load Widget**:
```tsx
import { loadPaymentWidget, PaymentWidget } from '@tosspayments/payment-widget-sdk';

const widget = await loadPaymentWidget(clientKey, customerKey);
widget.renderPaymentMethods(selector, options);
```

**Request Payment**:
```tsx
await widget.requestPayment({
  orderId: string,
  orderName: string,
  customerName: string,
  customerEmail: string,
  successUrl: string,
  failUrl: string,
});
```

### 4.2 Payment Confirmation API Route

**File**: `/src/app/api/payments/confirm/route.ts`

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { confirmPayment } from '@/lib/toss/client';
import { paymentConfirmSchema } from '@/schemas/payment';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validated = paymentConfirmSchema.parse(body);
    const { paymentKey, orderId, amount } = validated;

    // 3. Verify amount
    if (amount !== 3900) {
      return NextResponse.json({ error: 'AMOUNT_MISMATCH' }, { status: 400 });
    }

    const supabase = createClient();
    const user = await getUserByClerkId(supabase, userId);

    // 4. Check for duplicate payment
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'PAYMENT_ALREADY_PROCESSED',
        subscriptionEndsAt: user.subscription_ends_at,
      });
    }

    // 5. Call Toss Payments API
    const paymentResult = await confirmPayment({ paymentKey, orderId, amount });
    const billingKey = paymentResult.billingKey;

    // 6. Database transaction
    // Insert payment
    await supabase.from('payments').insert({
      user_id: user.id,
      order_id: orderId,
      payment_key: paymentKey,
      amount,
      status: 'done',
    });

    // Upsert billing key
    await supabase.from('billing_keys').upsert({
      user_id: user.id,
      billing_key: billingKey,
    });

    // Update user subscription
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

    await supabase.from('users').update({
      subscription_tier: 'pro',
      subscription_ends_at: subscriptionEndsAt.toISOString(),
      analyses_remaining: 10,
      cancelled_at: null,
    }).eq('id', user.id);

    return NextResponse.json({
      success: true,
      subscriptionEndsAt: subscriptionEndsAt.toISOString(),
    });

  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json(
      { error: 'PAYMENT_CONFIRM_FAILED' },
      { status: 500 }
    );
  }
}
```

### 4.3 Functions from `/src/lib/toss/client.ts`

```tsx
import { TossPaymentConfirmRequest } from '@/types/payment';

export async function confirmPayment(data: TossPaymentConfirmRequest) {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY + ':';
  const authHeader = `Basic ${Buffer.from(secretKey).toString('base64')}`;

  const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Payment confirmation failed');
  }

  return response.json();
}
```

### 4.4 Error Handling Strategy

**Widget Load Error**:
```tsx
try {
  const widget = await loadPaymentWidget(clientKey, customerKey);
} catch (error) {
  setError('결제 위젯을 불러올 수 없습니다. 페이지를 새로고침해주세요.');
}
```

**Payment Request Error**:
- Handled by Toss SDK, redirects to `failUrl`

**Payment Confirmation Error**:
```tsx
// In success page (will be created in 007-payment-success.md)
try {
  await fetch('/api/payments/confirm', { method: 'POST', body: ... });
} catch (error) {
  toast.error('결제 승인에 실패했습니다. 고객센터로 문의해주세요.');
}
```

## 5. Data Flow

### 5.1 Page Load Flow

```
1. User navigates to /subscription/upgrade
2. Middleware checks auth
3. page.tsx (Server Component):
   a. Fetch user from Supabase
   b. Check if already Pro → redirect to /subscription
   c. Render upgrade page
4. PaymentWidget (Client Component):
   a. Load Toss Payments SDK
   b. Initialize widget with clientKey, customerKey
   c. Render payment methods (#payment-widget)
```

### 5.2 Payment Flow

```
1. User clicks "지금 업그레이드하기"
2. Toss Widget processes payment
3. Success → Redirect to /payment/success with query params:
   - paymentKey, orderId, amount
4. Fail → Redirect to /payment/fail with error info
```

### 5.3 Payment Confirmation Flow (in Success Page)

```
1. Success page receives query params
2. Call POST /api/payments/confirm with:
   - paymentKey, orderId, amount
3. API Route:
   a. Authenticate user
   b. Validate amount (must be 3900)
   c. Check duplicate (orderId)
   d. Call Toss API to confirm payment + get billingKey
   e. Save payment, billing key, update user
4. Return success response
5. Success page shows "구독 완료!" message
6. Redirect to dashboard after 3s
```

## 6. Validation

### 6.1 Client-side Validation

- None required (Toss widget handles card validation)

### 6.2 Server-side Validation

**API Route** (`/api/payments/confirm`):
```tsx
import { paymentConfirmSchema } from '@/schemas/payment';

const validated = paymentConfirmSchema.parse({
  paymentKey,
  orderId,
  amount,
});

if (amount !== 3900) {
  throw new Error('AMOUNT_MISMATCH');
}
```

### 6.3 Error Message Display

- **Widget load error**: ErrorMessage component
- **Payment request error**: Toast notification
- **Confirmation error**: Handled in success/fail pages

## 7. UI Components

### 7.1 shadcn/ui Components

- `Card`, `CardHeader`, `CardContent` - UpgradeCard
- `Badge` - Pro badge
- `Button` - Payment button
- `Alert`, `AlertTitle`, `AlertDescription` - Warning banner

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4 max-w-3xl">
  <h1>Pro 요금제로 업그레이드</h1>

  <UpgradeCard />

  <WarningBanner />

  <PaymentWidget user={user} />
</main>
```

### 7.3 Responsive Design

- **Mobile**: Single column, full-width
- **Tablet/Desktop**: Max-width 900px, centered

### 7.4 Payment Widget Styling

Toss Payments widget provides its own styling. Ensure container has appropriate height:
```tsx
<div id="payment-widget" className="min-h-[400px]" />
```

## 8. Implementation Checklist

- [ ] Create `src/app/subscription/upgrade/page.tsx`
- [ ] Create `src/app/subscription/upgrade/components/UpgradeCard.tsx`
- [ ] Create `src/app/subscription/upgrade/components/WarningBanner.tsx`
- [ ] Create `src/app/subscription/upgrade/components/PaymentWidget.tsx`
- [ ] Create `src/app/api/payments/confirm/route.ts`
- [ ] Add `confirmPayment` to `/src/lib/toss/client.ts`
- [ ] Install `@tosspayments/payment-widget-sdk`
- [ ] Add payment confirmation schema to `/src/schemas/payment.ts`
- [ ] Test widget loading
- [ ] Test payment flow (sandbox mode)
- [ ] Test redirect to success/fail pages
- [ ] Test duplicate payment prevention
- [ ] Test amount validation
- [ ] Verify already-Pro redirect

## 9. Environment Variables

Ensure these are set in `.env.local`:
```env
NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=test_ck_XXXX
TOSS_PAYMENTS_SECRET_KEY=test_sk_XXXX
```

## 10. Performance Optimizations

- Lazy load Toss Payments SDK (only on this page)
- Server Component for static parts (UpgradeCard, WarningBanner)
- Client Component only for widget (interactivity required)

## 11. Accessibility

- Semantic HTML (h1, section, article)
- ARIA labels for payment widget container
- Keyboard navigation (widget handles internally)
- Screen reader announcements for errors

## 12. Testing Scenarios

### 12.1 Page Load Tests

- [ ] Free Tier user: Show upgrade page with widget
- [ ] Pro Active user: Redirect to /subscription with toast
- [ ] Pro Cancelled user (before expiry): Redirect to /subscription
- [ ] Pro Expired user: Show upgrade page

### 12.2 Widget Tests

- [ ] Widget loads successfully
- [ ] Widget renders payment methods
- [ ] Widget load error: Show error message with refresh button

### 12.3 Payment Tests (Sandbox Mode)

- [ ] Valid card: Redirect to /payment/success
- [ ] Invalid card: Redirect to /payment/fail
- [ ] Card limit exceeded: Redirect to /payment/fail

### 12.4 Confirmation Tests

- [ ] Valid payment: Pro activated, 10 analyses, subscription_ends_at set
- [ ] Duplicate confirmation: Return "PAYMENT_ALREADY_PROCESSED"
- [ ] Amount mismatch: Return error
- [ ] Database error: Return error, log for manual recovery

## 13. Edge Cases

- **Already Pro user**: Redirect to /subscription
- **Widget load timeout**: Show error after 10 seconds
- **Payment during processing**: Disable button, show loading
- **User leaves page during payment**: Toss handles redirect
- **Duplicate browser tabs**: Each tab generates unique orderId
- **Network error during confirmation**: Show error, allow retry on success page

## 14. Dependencies

### 14.1 External Libraries

- `@tosspayments/payment-widget-sdk` - Payment widget
- `@clerk/nextjs` - Authentication
- `zod` - Validation

### 14.2 Internal Dependencies

- `/src/lib/toss/client.ts` - confirmPayment
- `/src/lib/supabase/queries.ts` - getUserByClerkId
- `/src/schemas/payment.ts` - paymentConfirmSchema
- `/src/types/payment.ts` - TossPaymentConfirmRequest
- `/src/types/user.ts` - User
- `/src/constants/app.ts` - SUBSCRIPTION constants
- `/src/components/ui/` - shadcn/ui components

## 15. Toss Payments Sandbox Testing

### 15.1 Test Cards

Use test cards from Toss Payments docs:
- **Success**: `4000-0000-0000-0001`
- **Failure (card limit)**: `4000-0000-0000-0002`
- **Failure (invalid card)**: `4000-0000-0000-0003`

### 15.2 Test Environment

- Use `test_ck_XXXX` client key
- Use `test_sk_XXXX` secret key
- No actual charges in sandbox mode

## 16. Future Enhancements (Out of Scope)

- Multiple payment methods (PayPal, etc.)
- Annual subscription (discount)
- Coupon codes
- Free trial period
- Upgrade from within analysis creation flow
- Gift subscription

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx, PaymentWidget, and API route
