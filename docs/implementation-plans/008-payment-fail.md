# Implementation Plan: Payment Fail Page

## 1. Overview

- **Purpose**: Handle failed payment callback from Toss Payments and display error message with retry option
- **Route**: `/payment/fail`
- **Auth**: Required
- **Related Usecases**: UC-004 (Pro 요금제 업그레이드) - Failure flow

## 2. File Structure

```
src/app/payment/fail/
├── page.tsx                    # Client Component (handle query params, show error)
└── components/
    └── FailMessage.tsx         # Client Component (error UI)
```

## 3. Components Breakdown

### 3.1 Client Components

**page.tsx** (Main Fail Page)
- **Type**: Client Component (needs to read search params)
- **Purpose**: Receive failure callback, display error reason, provide retry option
- **Query Params** (from Toss Payments):
  - `code`: Error code
  - `message`: Error message
  - `orderId`: Order ID (optional)
- **Flow**:
  ```tsx
  'use client';

  import { useSearchParams } from 'next/navigation';

  export default function PaymentFailPage() {
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const message = searchParams.get('message');
    const orderId = searchParams.get('orderId');

    return (
      <FailMessage
        code={code || 'UNKNOWN_ERROR'}
        message={message || '알 수 없는 오류가 발생했습니다.'}
        orderId={orderId}
      />
    );
  }
  ```

**FailMessage.tsx**
- **Type**: Client Component
- **Purpose**: Display error message and action buttons
- **Props**:
  ```tsx
  interface FailMessageProps {
    code: string;
    message: string;
    orderId?: string | null;
  }
  ```
- **Display**:
  ```tsx
  import { XCircle } from 'lucide-react';

  <div className="flex flex-col items-center justify-center min-h-screen">
    <XCircle className="w-16 h-16 text-red-500" />
    <h1 className="text-2xl font-bold mt-4">결제에 실패했습니다</h1>
    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
      <p className="text-red-800 font-semibold">오류 사유:</p>
      <p className="text-red-600">{getErrorMessage(code, message)}</p>
      {orderId && (
        <p className="text-sm text-gray-500 mt-2">주문번호: {orderId}</p>
      )}
    </div>

    <div className="mt-6 flex gap-4">
      <Button
        onClick={() => router.push('/subscription/upgrade')}
        variant="default"
      >
        다시 시도
      </Button>
      <Button
        onClick={() => router.push('/dashboard')}
        variant="outline"
      >
        대시보드로 돌아가기
      </Button>
    </div>

    <p className="mt-6 text-sm text-gray-500">
      문제가 지속되면 고객센터로 문의해주세요.
    </p>
  </div>
  ```

**Error Message Mapping**:
```tsx
function getErrorMessage(code: string, message: string): string {
  const errorMessages: Record<string, string> = {
    'CARD_LIMIT_EXCEEDED': '카드 한도를 초과했습니다. 다른 카드를 사용해주세요.',
    'CARD_INVALID': '유효하지 않은 카드입니다.',
    'CARD_EXPIRED': '카드 유효기간이 만료되었습니다.',
    'CARD_AUTH_FAILED': '카드 인증에 실패했습니다.',
    'INSUFFICIENT_BALANCE': '잔액이 부족합니다.',
    'PAYMENT_CANCELLED': '결제를 취소하셨습니다.',
    'NETWORK_ERROR': '네트워크 오류가 발생했습니다.',
    'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.',
  };

  return errorMessages[code] || message || '결제 처리 중 오류가 발생했습니다.';
}
```

### 3.2 Reusable Components from `/src/components/`

- `/src/components/ui/button.tsx` - Action buttons
- `lucide-react` - XCircle icon

## 4. API Integration

### 4.1 No API Calls Required

- This page only displays the error
- No need to confirm or save anything to the database
- Payment was not completed

## 5. Data Flow

### 5.1 Fail Flow

```
1. Toss Payments redirects to /payment/fail?code=CARD_LIMIT_EXCEEDED&message=카드한도초과&orderId=xxx
2. page.tsx (Client Component):
   a. Extract query params (code, message, orderId)
   b. Render FailMessage with error details
3. User can:
   a. Click "다시 시도" → /subscription/upgrade
   b. Click "대시보드로 돌아가기" → /dashboard
```

## 6. Validation

### 6.1 Client-side Validation

- Check if query params exist
- Provide fallback values if missing

### 6.2 Server-side Validation

- None required (no API calls)

### 6.3 Error Message Display

- Show user-friendly error messages based on error code
- Fall back to Toss's original message if code unknown

## 7. UI Components

### 7.1 shadcn/ui Components

- `Button` - Action buttons
- `Alert` (optional) - Error box
- `XCircle` (lucide-react) - Error icon

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4">
  <div className="flex flex-col items-center justify-center min-h-screen">
    <XCircle />
    <h1>결제 실패</h1>
    <ErrorBox>
      <ErrorCode />
      <ErrorMessage />
      <OrderId />
    </ErrorBox>
    <Actions>
      <RetryButton />
      <BackButton />
    </Actions>
    <HelpText />
  </div>
</main>
```

### 7.3 Responsive Design

- Center-aligned content
- Works on all screen sizes

## 8. Implementation Checklist

- [ ] Create `src/app/payment/fail/page.tsx` (Client Component)
- [ ] Create `src/app/payment/fail/components/FailMessage.tsx`
- [ ] Extract query params (code, message, orderId)
- [ ] Map error codes to user-friendly messages
- [ ] Add "다시 시도" button → /subscription/upgrade
- [ ] Add "대시보드로 돌아가기" button → /dashboard
- [ ] Test with different error codes
- [ ] Test missing query params
- [ ] Verify responsive layout

## 9. Performance Optimizations

- Use Client Component (required for query params)
- No API calls, instant render

## 10. Accessibility

- Semantic HTML (h1, main)
- ARIA labels for icons
- Clear error messages
- Keyboard navigation for buttons

## 11. Testing Scenarios

### 11.1 Error Code Tests

- [ ] CARD_LIMIT_EXCEEDED: Show "카드 한도 초과" message
- [ ] CARD_INVALID: Show "유효하지 않은 카드" message
- [ ] PAYMENT_CANCELLED: Show "결제 취소" message
- [ ] Unknown code: Show original Toss message

### 11.2 Navigation Tests

- [ ] Click "다시 시도": Navigate to /subscription/upgrade
- [ ] Click "대시보드로 돌아가기": Navigate to /dashboard

### 11.3 Edge Cases

- [ ] Missing code: Show fallback error message
- [ ] Missing message: Show default error message
- [ ] Missing orderId: Don't display order number section

## 12. Edge Cases

- **Missing query params**: Show default error message
- **Unknown error code**: Display Toss's original message
- **Page refresh**: Error details persist (from URL params)
- **Direct access**: Show generic error (no params)

## 13. Dependencies

### 13.1 External Libraries

- `lucide-react` - XCircle icon
- `next/navigation` - useSearchParams, useRouter

### 13.2 Internal Dependencies

- `/src/components/ui/button.tsx`

## 14. Common Error Codes from Toss Payments

| Code | Meaning | User Message |
|------|---------|--------------|
| CARD_LIMIT_EXCEEDED | 카드 한도 초과 | 카드 한도를 초과했습니다. 다른 카드를 사용해주세요. |
| CARD_INVALID | 유효하지 않은 카드 | 유효하지 않은 카드입니다. |
| CARD_EXPIRED | 카드 만료 | 카드 유효기간이 만료되었습니다. |
| INSUFFICIENT_BALANCE | 잔액 부족 | 잔액이 부족합니다. |
| PAYMENT_CANCELLED | 사용자 취소 | 결제를 취소하셨습니다. |

## 15. Future Enhancements (Out of Scope)

- Log errors to analytics (Sentry, etc.)
- Suggest alternative payment methods
- Contact support directly from fail page
- Auto-retry with different amount (for testing)

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx and FailMessage component
