# Implementation Plan: Subscription Management Page

## 1. Overview

- **Purpose**: Display current subscription status, manage subscription (upgrade, cancel, resume), and view payment history
- **Route**: `/subscription`
- **Auth**: Required
- **Related Usecases**: UC-004 (구독 업그레이드), Subscription management

## 2. File Structure

```
src/app/subscription/
├── page.tsx                    # Server Component (main page)
├── components/
│   ├── CurrentPlan.tsx        # Server Component (current subscription)
│   ├── PaymentHistory.tsx     # Server Component (payment list)
│   ├── CancelModal.tsx        # Client Component (cancel confirmation)
│   └── ResumeButton.tsx       # Client Component (resume subscription)
└── actions.ts                  # Server Actions (cancel, resume)
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Subscription Page)
- **Type**: Server Component
- **Purpose**: Fetch user subscription data and render appropriate UI
- **Data Fetching**:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getUserByClerkId } from '@/lib/supabase/queries';

  const { userId } = await auth();
  const user = await getUserByClerkId(supabase, userId);
  const subscriptionStatus = calculateSubscriptionStatus(user);
  const payments = await getPaymentHistory(supabase, user.id);
  ```
- **Structure**:
  ```tsx
  <main>
    <h1>구독 관리</h1>
    <CurrentPlan user={user} status={subscriptionStatus} />
    <PaymentHistory payments={payments} />
  </main>
  ```

**CurrentPlan.tsx**
- **Type**: Server Component
- **Purpose**: Display current subscription plan and actions
- **Props**:
  ```tsx
  interface CurrentPlanProps {
    user: User;
    status: SubscriptionStatus;
  }
  ```
- **Display by Subscription Type**:

  **Free Tier**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>무료 요금제</h2>
      <Badge>Free</Badge>
    </CardHeader>
    <CardContent>
      <p>남은 분석: {user.analyses_remaining}/3회</p>
      <p>모델: Gemini Flash</p>
      <Button asChild>
        <Link href="/subscription/upgrade">Pro 요금제로 업그레이드</Link>
      </Button>
    </CardContent>
  </Card>
  ```

  **Pro Active**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>Pro 요금제</h2>
      <Badge>Pro</Badge>
    </CardHeader>
    <CardContent>
      <p>남은 분석: {user.analyses_remaining}/10회</p>
      <p>모델: Gemini Pro</p>
      <p>다음 결제일: {formatDate(status.endsAt)}</p>
      <CancelButton />
    </CardContent>
  </Card>
  ```

  **Pro Cancelled**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>Pro 요금제 (취소 예정)</h2>
      <Badge variant="destructive">취소 예정</Badge>
    </CardHeader>
    <CardContent>
      <p>서비스 이용 종료일: {formatDate(status.endsAt)}</p>
      <p>종료일까지 Pro 요금제를 이용할 수 있습니다.</p>
      <ResumeButton />
    </CardContent>
  </Card>
  ```

  **Pro Expired**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>만료된 구독</h2>
      <Badge variant="secondary">만료</Badge>
    </CardHeader>
    <CardContent>
      <p>Pro 구독이 만료되었습니다.</p>
      <Button asChild>
        <Link href="/subscription/upgrade">다시 구독하기</Link>
      </Button>
    </CardContent>
  </Card>
  ```

**PaymentHistory.tsx**
- **Type**: Server Component
- **Purpose**: Display payment history table
- **Props**:
  ```tsx
  interface PaymentHistoryProps {
    payments: Payment[];
  }
  ```
- **Display**:
  ```tsx
  <Card>
    <CardHeader>
      <h2>결제 내역</h2>
    </CardHeader>
    <CardContent>
      {payments.length === 0 ? (
        <p>아직 결제 내역이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>날짜</TableHead>
              <TableHead>금액</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell>{formatDate(payment.created_at)}</TableCell>
                <TableCell>{payment.amount.toLocaleString()}원</TableCell>
                <TableCell>
                  <Badge variant={payment.status === 'done' ? 'default' : 'destructive'}>
                    {payment.status === 'done' ? '완료' : '실패'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardContent>
  </Card>
  ```

### 3.2 Client Components

**CancelButton.tsx** (within CurrentPlan or separate)
- **Type**: Client Component
- **Purpose**: Cancel subscription with confirmation modal
- **State**:
  ```tsx
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  ```
- **Functionality**:
  ```tsx
  const handleCancel = async () => {
    setIsLoading(true);
    try {
      await cancelSubscription();
      toast.success('구독이 취소되었습니다.');
      router.refresh();
    } catch (error) {
      toast.error('구독 취소에 실패했습니다.');
    } finally {
      setIsLoading(false);
      setShowModal(false);
    }
  };
  ```

**CancelModal.tsx**
- **Type**: Client Component
- **Purpose**: Confirmation modal for cancellation
- **Props**:
  ```tsx
  interface CancelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    endsAt: Date;
  }
  ```
- **Display**:
  ```tsx
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
        <AlertDialogDescription>
          구독을 취소하면 {formatDate(endsAt)}까지 서비스 이용이 가능하며,
          이후 자동으로 무료 요금제로 전환됩니다.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>취소</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>구독 취소 확정</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  ```

**ResumeButton.tsx**
- **Type**: Client Component
- **Purpose**: Resume cancelled subscription
- **Functionality**:
  ```tsx
  const handleResume = async () => {
    setIsLoading(true);
    try {
      await resumeSubscription();
      toast.success('구독이 재개되었습니다.');
      router.refresh();
    } catch (error) {
      toast.error('구독 재개에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };
  ```

### 3.3 Reusable Components from `/src/components/`

- `/src/components/ui/card.tsx` - Card layout
- `/src/components/ui/badge.tsx` - Status badges
- `/src/components/ui/button.tsx` - Action buttons
- `/src/components/ui/table.tsx` - Payment history table
- `/src/components/ui/alert-dialog.tsx` - Cancel confirmation modal

## 4. API Integration

### 4.1 Data Sources

**Server-side (page.tsx)**:
```tsx
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId, getPaymentHistory } from '@/lib/supabase/queries';

const supabase = createClient();
const user = await getUserByClerkId(supabase, userId);
const payments = await getPaymentHistory(supabase, user.id);
```

### 4.2 Server Actions (actions.ts)

**Cancel Subscription**:
```tsx
'use server';

export async function cancelSubscription() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createClient();
  const user = await getUserByClerkId(supabase, userId);

  // Check if Pro and active
  if (user.subscription_tier !== 'pro' || user.cancelled_at) {
    throw new Error('No active Pro subscription');
  }

  // Update subscription status
  await supabase
    .from('users')
    .update({
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Note: Billing key deletion happens in Cron Job when subscription_ends_at is reached
}
```

**Resume Subscription**:
```tsx
'use server';

export async function resumeSubscription() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  const supabase = createClient();
  const user = await getUserByClerkId(supabase, userId);

  // Check if cancelled and not expired
  if (!user.cancelled_at || new Date(user.subscription_ends_at) < new Date()) {
    throw new Error('Cannot resume subscription');
  }

  // Resume subscription
  await supabase
    .from('users')
    .update({
      cancelled_at: null,
    })
    .eq('id', user.id);
}
```

### 4.3 Functions from `/src/lib/supabase/queries.ts`

```tsx
export async function getPaymentHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}
```

### 4.4 Error Handling Strategy

**Cancel Subscription Error**:
```tsx
try {
  await cancelSubscription();
} catch (error) {
  if (error.message === 'No active Pro subscription') {
    toast.error('취소할 구독이 없습니다.');
  } else {
    toast.error('구독 취소에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
}
```

**Resume Subscription Error**:
```tsx
try {
  await resumeSubscription();
} catch (error) {
  if (error.message === 'Cannot resume subscription') {
    toast.error('구독을 재개할 수 없습니다. 구독이 이미 만료되었거나 활성 상태입니다.');
  } else {
    toast.error('구독 재개에 실패했습니다.');
  }
}
```

## 5. Data Flow

### 5.1 Server → Client

```
1. User accesses /subscription
2. Middleware checks auth
3. page.tsx (Server Component):
   a. Fetch user from Supabase
   b. Calculate subscription status
   c. Fetch payment history
4. Render CurrentPlan (server)
5. Render PaymentHistory (server)
6. Render CancelButton or ResumeButton (client, if applicable)
```

### 5.2 Cancel Subscription Flow

```
1. User clicks "구독 취소" button
2. CancelModal opens
3. User confirms "구독 취소 확정"
4. Call Server Action: cancelSubscription()
5. Server Action updates cancelled_at in Supabase
6. Return success
7. Client shows toast and refreshes page
8. CurrentPlan updates to "Pro 요금제 (취소 예정)"
```

### 5.3 Resume Subscription Flow

```
1. User clicks "구독 재개" button
2. Call Server Action: resumeSubscription()
3. Server Action sets cancelled_at to NULL
4. Return success
5. Client shows toast and refreshes page
6. CurrentPlan updates to "Pro 요금제"
```

### 5.4 Navigation Flow

- **"Pro 업그레이드"** → `/subscription/upgrade`
- **"다시 구독하기"** → `/subscription/upgrade`

## 6. Validation

### 6.1 Client-side Validation

- None required (button actions only)

### 6.2 Server-side Validation

**Cancel Subscription**:
- User must be authenticated
- User must have Pro subscription
- Subscription must not already be cancelled

**Resume Subscription**:
- User must be authenticated
- Subscription must be cancelled
- Subscription must not be expired

### 6.3 Error Message Display

- **Cancel error**: Toast notification
- **Resume error**: Toast notification
- **Database error**: Toast notification

## 7. UI Components

### 7.1 shadcn/ui Components

- `Card`, `CardHeader`, `CardContent` - Layout
- `Badge` - Status badges
- `Button` - Action buttons
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - Payment history
- `AlertDialog` - Cancel confirmation
- `Toast` (via sonner) - Notifications

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4 max-w-4xl">
  <h1>구독 관리</h1>

  <CurrentPlan user={user} status={subscriptionStatus} />

  <PaymentHistory payments={payments} />
</main>
```

### 7.3 Responsive Design

- **Mobile**: Single column, stacked cards
- **Tablet/Desktop**: Single column, max-width 1024px

## 8. Implementation Checklist

- [ ] Create `src/app/subscription/page.tsx` (Server Component)
- [ ] Create `src/app/subscription/components/CurrentPlan.tsx`
- [ ] Create `src/app/subscription/components/PaymentHistory.tsx`
- [ ] Create `src/app/subscription/components/CancelModal.tsx`
- [ ] Create `src/app/subscription/components/ResumeButton.tsx`
- [ ] Create `src/app/subscription/actions.ts` (Server Actions)
- [ ] Add `getPaymentHistory` to `/src/lib/supabase/queries.ts`
- [ ] Implement cancel subscription logic
- [ ] Implement resume subscription logic
- [ ] Add confirmation modal for cancel
- [ ] Add toast notifications
- [ ] Test cancel flow (Free → error, Pro → success)
- [ ] Test resume flow (Cancelled → success, Expired → error)
- [ ] Test payment history display
- [ ] Verify responsive layout

## 9. Performance Optimizations

- Use Server Components for static parts
- Use Client Components only for interactive buttons
- Cache payment history (React Server Components cache)

## 10. Accessibility

- Semantic HTML (h1, h2, section)
- ARIA labels for buttons
- Keyboard navigation (Tab through buttons, Enter to confirm)
- Screen reader announcements for modals
- Focus management (modal opens → focus on modal)

## 11. Testing Scenarios

### 11.1 Display Tests

- [ ] Free Tier: Show "무료 요금제", "Pro 업그레이드" button
- [ ] Pro Active: Show "Pro 요금제", "구독 취소" button, next payment date
- [ ] Pro Cancelled: Show "취소 예정", "구독 재개" button, end date
- [ ] Pro Expired: Show "만료", "다시 구독하기" button

### 11.2 Action Tests

- [ ] Cancel (Free): Error toast
- [ ] Cancel (Pro Active): Success, status changes to "취소 예정"
- [ ] Cancel (Pro Cancelled): Error toast (already cancelled)
- [ ] Resume (Pro Cancelled): Success, status changes to "Pro 요금제"
- [ ] Resume (Pro Expired): Error toast
- [ ] Resume (Pro Active): Error toast

### 11.3 Payment History Tests

- [ ] No payments: Show "아직 결제 내역이 없습니다"
- [ ] 1-10 payments: Display all in table
- [ ] Payment status "done": Green badge
- [ ] Payment status "failed": Red badge

## 12. Edge Cases

- **Cancel already cancelled**: Show error toast
- **Resume expired subscription**: Show error toast, suggest re-subscribing
- **Cancel during billing day**: Prevent (wait for payment)
- **Network error during cancel/resume**: Show error, allow retry
- **Billing key missing**: User can still cancel (billing key deletion happens in Cron)

## 13. Dependencies

### 13.1 External Libraries

- `@clerk/nextjs` - Authentication
- `sonner` (optional) - Toast notifications
- `lucide-react` - Icons

### 13.2 Internal Dependencies

- `/src/lib/supabase/queries.ts` - getUserByClerkId, getPaymentHistory
- `/src/types/user.ts` - User, SubscriptionStatus
- `/src/types/payment.ts` - Payment
- `/src/utils/subscription.ts` - calculateSubscriptionStatus
- `/src/utils/date.ts` - formatDate
- `/src/components/ui/` - shadcn/ui components

## 14. Future Enhancements (Out of Scope)

- Change payment method
- Upgrade to annual plan
- Proration for plan changes
- Subscription pause (temporary hold)
- Invoice download
- Email notifications for billing events

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx, components, and Server Actions
