# State Management Plan

## Document Overview

This document defines the state management strategy for all pages in the Saju Analysis Service. The service uses a **Context + useReducer** pattern for complex state management, combined with local state (useState) for simple, page-specific state.

**Design Principles**:
- Minimize global state - prefer local state when possible
- Use Context for shared state across multiple components
- Use useReducer for complex state with multiple actions
- Consider loading, error, and success states for all async operations
- Validate user input before dispatching actions
- Use existing types from `/src/types/` for type safety

---

## Global State Management

### UserContext (Global)

**Purpose**: Provide current user information and subscription status across the entire app

**Location**: `/src/contexts/UserContext.tsx`

**State Structure**:
```typescript
interface UserState {
  user: User | null;
  subscriptionStatus: SubscriptionStatus;
  isLoading: boolean;
  error: string | null;
}
```

**Actions**:
```typescript
type UserAction =
  | { type: 'FETCH_USER_START' }
  | { type: 'FETCH_USER_SUCCESS'; payload: { user: User; subscriptionStatus: SubscriptionStatus } }
  | { type: 'FETCH_USER_ERROR'; payload: string }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'UPDATE_ANALYSES_REMAINING'; payload: number }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: { tier: SubscriptionTier; endsAt?: string | null } }
  | { type: 'RESET_USER' };
```

**Context Provider**:
- Wraps the entire app in `/src/app/layout.tsx`
- Fetches user data on mount using Clerk user ID
- Provides user state and actions to all child components

**Hook**: `useUser()` - Access user state and dispatch actions

**Used By**:
- All protected pages (Dashboard, Analysis, Subscription, Account)
- Navigation components
- Subscription status displays

---

## Page-Specific State Management

### 1. Home Page (`/`)

**State Needed**: None (static marketing page)

**Implementation**: Server Component with static content

**Notes**:
- No client-side state management required
- Pricing information is hardcoded from constants
- CTA buttons link to signup/login pages

---

### 2. Dashboard (`/dashboard`)

**State Structure**:
```typescript
interface DashboardState {
  analyses: Analysis[];
  filteredAnalyses: Analysis[];
  searchQuery: string;
  sortBy: 'newest' | 'oldest';
  isLoading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
  };
}
```

**Initial State**:
```typescript
const initialState: DashboardState = {
  analyses: [],
  filteredAnalyses: [],
  searchQuery: '',
  sortBy: 'newest',
  isLoading: true,
  error: null,
  pagination: {
    currentPage: 1,
    pageSize: 10,
    totalCount: 0,
  },
};
```

**Actions**:
```typescript
type DashboardAction =
  | { type: 'FETCH_ANALYSES_START' }
  | { type: 'FETCH_ANALYSES_SUCCESS'; payload: { analyses: Analysis[]; totalCount: number } }
  | { type: 'FETCH_ANALYSES_ERROR'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SORT_BY'; payload: 'newest' | 'oldest' }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'FILTER_ANALYSES' };
```

**State Management Approach**:
- **Local state with useReducer** for analyses list and filters
- **UserContext** for subscription status
- **No dedicated context** - state is local to the Dashboard page

**Key Flows**:
1. **Initial Load**:
   - Dispatch `FETCH_ANALYSES_START`
   - Fetch analyses from API
   - Dispatch `FETCH_ANALYSES_SUCCESS` or `FETCH_ANALYSES_ERROR`

2. **Search**:
   - Dispatch `SET_SEARCH_QUERY` with input value
   - Dispatch `FILTER_ANALYSES` to update filteredAnalyses
   - Debounce search input (300ms)

3. **Sort**:
   - Dispatch `SET_SORT_BY` with sort option
   - Dispatch `FILTER_ANALYSES` to re-sort

4. **Pagination**:
   - Dispatch `SET_PAGE` with page number
   - Fetch next page of analyses

**Components**:
- `DashboardPage` - Main component with useReducer
- `AnalysisCard` - Display individual analysis
- `SearchBar` - Search input with debounce
- `SubscriptionCard` - Shows subscription status (uses UserContext)

---

### 3. New Analysis (`/analysis/new`)

**State Structure**:
```typescript
interface NewAnalysisState {
  // Form fields
  formData: {
    name: string;
    birth_date: string;
    birth_time: string;
    is_lunar: boolean;
    gender: Gender | '';
    time_zone: string;
    additional_info: string;
  };

  // UI state
  birthTimeUnknown: boolean;

  // Validation errors
  errors: {
    name?: string;
    birth_date?: string;
    birth_time?: string;
    gender?: string;
  };

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;

  // Analysis result
  analysisId: string | null;
}
```

**Initial State**:
```typescript
const initialState: NewAnalysisState = {
  formData: {
    name: '',
    birth_date: '',
    birth_time: '',
    is_lunar: false,
    gender: '',
    time_zone: 'Asia/Seoul',
    additional_info: '',
  },
  birthTimeUnknown: false,
  errors: {},
  isSubmitting: false,
  submitError: null,
  analysisId: null,
};
```

**Actions**:
```typescript
type NewAnalysisAction =
  | { type: 'UPDATE_FIELD'; payload: { field: keyof NewAnalysisState['formData']; value: any } }
  | { type: 'TOGGLE_BIRTH_TIME_UNKNOWN' }
  | { type: 'SET_VALIDATION_ERROR'; payload: { field: string; error: string } }
  | { type: 'CLEAR_VALIDATION_ERRORS' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; payload: string } // analysisId
  | { type: 'SUBMIT_ERROR'; payload: string }
  | { type: 'RESET_FORM' };
```

**State Management Approach**:
- **Local state with useReducer** for form data and submission
- **UserContext** to check analyses remaining
- **Multi-step flow**: Form → Loading → Result redirect

**Key Flows**:
1. **Form Input**:
   - User types: Dispatch `UPDATE_FIELD` with field name and value
   - Real-time validation: Dispatch `SET_VALIDATION_ERROR` if invalid
   - Toggle "모름": Dispatch `TOGGLE_BIRTH_TIME_UNKNOWN`

2. **Form Submission**:
   - Validate all fields
   - Check analyses remaining from UserContext
   - If insufficient: Show upgrade modal
   - If sufficient: Dispatch `SUBMIT_START`
   - Call API to create analysis
   - Dispatch `SUBMIT_SUCCESS` with analysisId
   - Redirect to `/analysis/[id]`
   - On error: Dispatch `SUBMIT_ERROR`

3. **Loading State**:
   - Show loading UI when `isSubmitting = true`
   - Display "AI가 분석 중입니다..." message
   - Show spinner animation

**Components**:
- `NewAnalysisPage` - Main component with useReducer
- `AnalysisForm` - Form fields
- `LoadingScreen` - Shows during analysis
- `UpgradeModal` - Shows if analyses remaining = 0

**Validation Rules**:
- name: min 2 chars, max 50 chars
- birth_date: valid date, past date, within 150 years
- birth_time: valid time format (HH:mm) or empty if unknown
- gender: must be 'male' or 'female'

---

### 4. Analysis Detail (`/analysis/[id]`)

**State Structure**:
```typescript
interface AnalysisDetailState {
  analysis: Analysis | null;
  isLoading: boolean;
  error: string | null;
}
```

**Initial State**:
```typescript
const initialState: AnalysisDetailState = {
  analysis: null,
  isLoading: true,
  error: null,
};
```

**Actions**:
```typescript
type AnalysisDetailAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Analysis }
  | { type: 'FETCH_ERROR'; payload: string };
```

**State Management Approach**:
- **Local useState** (simple state - only 3 states)
- **No reducer needed** - state transitions are straightforward
- **Server Component preferred** for initial load

**Key Flows**:
1. **Initial Load**:
   - Extract analysis ID from URL params
   - Fetch analysis from API
   - Verify ownership (analysis.user_id matches current user)
   - Render Markdown result

2. **Error Handling**:
   - Analysis not found: Show 404 message
   - Unauthorized: Redirect to dashboard
   - Network error: Show retry button

**Components**:
- `AnalysisDetailPage` - Main component
- `AnalysisInfo` - Display subject info (name, birth date, etc.)
- `AnalysisResult` - Render Markdown with syntax highlighting
- `ActionButtons` - "대시보드로 돌아가기", "새 분석하기"

**Implementation Note**:
Consider implementing as Server Component with data fetching in page component, then pass to Client Component for Markdown rendering.

---

### 5. Subscription Management (`/subscription`)

**State Structure**:
```typescript
interface SubscriptionState {
  // Payment history
  payments: Payment[];
  isLoadingPayments: boolean;
  paymentsError: string | null;

  // Cancel modal
  showCancelModal: boolean;
  isCancelling: boolean;
  cancelError: string | null;

  // Resume subscription
  isResuming: boolean;
  resumeError: string | null;
}
```

**Initial State**:
```typescript
const initialState: SubscriptionState = {
  payments: [],
  isLoadingPayments: false,
  paymentsError: null,
  showCancelModal: false,
  isCancelling: false,
  cancelError: null,
  isResuming: false,
  resumeError: null,
};
```

**Actions**:
```typescript
type SubscriptionAction =
  | { type: 'FETCH_PAYMENTS_START' }
  | { type: 'FETCH_PAYMENTS_SUCCESS'; payload: Payment[] }
  | { type: 'FETCH_PAYMENTS_ERROR'; payload: string }
  | { type: 'SHOW_CANCEL_MODAL' }
  | { type: 'HIDE_CANCEL_MODAL' }
  | { type: 'CANCEL_START' }
  | { type: 'CANCEL_SUCCESS' }
  | { type: 'CANCEL_ERROR'; payload: string }
  | { type: 'RESUME_START' }
  | { type: 'RESUME_SUCCESS' }
  | { type: 'RESUME_ERROR'; payload: string };
```

**State Management Approach**:
- **Local state with useReducer** for subscription actions
- **UserContext** for current subscription status
- **Update UserContext** after successful cancel/resume

**Key Flows**:
1. **View Subscription**:
   - Get subscription status from UserContext
   - Dispatch `FETCH_PAYMENTS_START`
   - Fetch payment history from API
   - Dispatch `FETCH_PAYMENTS_SUCCESS`

2. **Cancel Subscription**:
   - Dispatch `SHOW_CANCEL_MODAL`
   - User confirms: Dispatch `CANCEL_START`
   - Call API to cancel subscription
   - Dispatch `CANCEL_SUCCESS`
   - Update UserContext with new status
   - Hide modal

3. **Resume Subscription**:
   - Dispatch `RESUME_START`
   - Call API to resume subscription
   - Dispatch `RESUME_SUCCESS`
   - Update UserContext with active status

**Components**:
- `SubscriptionPage` - Main component with useReducer
- `SubscriptionStatusCard` - Display current status (uses UserContext)
- `PaymentHistoryTable` - List of past payments
- `CancelModal` - Confirmation dialog
- `UpgradeButton` - Link to upgrade page (if free tier)

**Display Logic Based on Status**:
- **free**: Show upgrade button, remaining free analyses
- **pro_active**: Show next billing date, remaining analyses, cancel button
- **pro_cancelled**: Show service end date, resume button
- **pro_expired**: Show "expired" message, re-subscribe button

---

### 6. Subscription Upgrade (`/subscription/upgrade`)

**State Structure**:
```typescript
interface UpgradeState {
  // Payment widget
  widgetLoaded: boolean;
  widgetError: string | null;

  // Payment info
  orderId: string;

  // Checkbox
  agreeToTerms: boolean;
  agreeToPolicy: boolean;

  // Submission
  isProcessing: boolean;
  processingError: string | null;
}
```

**Initial State**:
```typescript
const initialState: UpgradeState = {
  widgetLoaded: false,
  widgetError: null,
  orderId: generateOrderId(), // UUID
  agreeToTerms: false,
  agreeToPolicy: false,
  isProcessing: false,
  processingError: null,
};
```

**Actions**:
```typescript
type UpgradeAction =
  | { type: 'WIDGET_LOADED' }
  | { type: 'WIDGET_ERROR'; payload: string }
  | { type: 'TOGGLE_TERMS' }
  | { type: 'TOGGLE_POLICY' }
  | { type: 'PAYMENT_START' }
  | { type: 'PAYMENT_ERROR'; payload: string };
```

**State Management Approach**:
- **Local state with useReducer** for payment widget
- **UserContext** to check if already Pro
- **No payment data stored** - handled by Toss SDK

**Key Flows**:
1. **Page Load**:
   - Check user from UserContext
   - If already Pro: Redirect to subscription page
   - Generate orderId
   - Load Toss Payment Widget
   - Dispatch `WIDGET_LOADED` or `WIDGET_ERROR`

2. **Payment Process**:
   - User enters payment info in Toss widget
   - User checks agreement boxes: Dispatch `TOGGLE_TERMS`, `TOGGLE_POLICY`
   - User clicks "결제하기"
   - Validate agreements checked
   - Dispatch `PAYMENT_START`
   - Toss SDK processes payment
   - On success: Redirect to `/payment/success?paymentKey=...&orderId=...&amount=...`
   - On fail: Redirect to `/payment/fail?code=...&message=...`

**Components**:
- `UpgradePage` - Main component with useReducer
- `PricingInfo` - Display Pro benefits
- `PaymentWidget` - Toss payment widget container
- `AgreementCheckboxes` - Terms and policy checkboxes
- `WarningNotice` - "구독 후 환불이 불가합니다" message

**Toss Widget Configuration**:
```typescript
{
  clientKey: process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY,
  customerKey: user.clerk_user_id,
  amount: 3900,
  orderId: state.orderId,
  orderName: "사주 분석 서비스 Pro 구독",
  successUrl: `${window.location.origin}/payment/success`,
  failUrl: `${window.location.origin}/payment/fail`,
}
```

---

### 7. Payment Success (`/payment/success`)

**State Structure**:
```typescript
interface PaymentSuccessState {
  // URL params
  paymentKey: string | null;
  orderId: string | null;
  amount: number | null;

  // Confirmation
  isConfirming: boolean;
  confirmationError: string | null;
  isConfirmed: boolean;

  // Auto-redirect
  redirectCountdown: number; // seconds
}
```

**Initial State**:
```typescript
const initialState: PaymentSuccessState = {
  paymentKey: null,
  orderId: null,
  amount: null,
  isConfirming: true,
  confirmationError: null,
  isConfirmed: false,
  redirectCountdown: 3,
};
```

**Actions**:
```typescript
type PaymentSuccessAction =
  | { type: 'SET_PAYMENT_INFO'; payload: { paymentKey: string; orderId: string; amount: number } }
  | { type: 'CONFIRM_START' }
  | { type: 'CONFIRM_SUCCESS' }
  | { type: 'CONFIRM_ERROR'; payload: string }
  | { type: 'DECREMENT_COUNTDOWN' };
```

**State Management Approach**:
- **Local state with useReducer**
- **Update UserContext** after successful confirmation
- **Auto-redirect** after 3 seconds

**Key Flows**:
1. **Page Load**:
   - Extract query params (paymentKey, orderId, amount)
   - Dispatch `SET_PAYMENT_INFO`
   - Dispatch `CONFIRM_START`
   - Call API to confirm payment
   - Dispatch `CONFIRM_SUCCESS` or `CONFIRM_ERROR`
   - Update UserContext with Pro subscription
   - Start countdown timer

2. **Countdown**:
   - Every 1 second: Dispatch `DECREMENT_COUNTDOWN`
   - When countdown = 0: Redirect to dashboard

**Components**:
- `PaymentSuccessPage` - Main component with useReducer
- `SuccessMessage` - Celebration UI
- `SubscriptionInfo` - Display Pro benefits
- `CountdownTimer` - Auto-redirect countdown
- `DashboardButton` - Manual redirect button

**Error Handling**:
- Missing query params: Show error, provide link to subscription page
- Confirmation API failure: Show error, provide retry button
- Network error: Show error with contact info

---

### 8. Payment Fail (`/payment/fail`)

**State Structure**:
```typescript
interface PaymentFailState {
  // URL params
  errorCode: string | null;
  errorMessage: string | null;
  orderId: string | null;
}
```

**Initial State**:
```typescript
const initialState: PaymentFailState = {
  errorCode: null,
  errorMessage: null,
  orderId: null,
};
```

**Actions**:
```typescript
type PaymentFailAction =
  | { type: 'SET_ERROR_INFO'; payload: { code: string; message: string; orderId?: string } };
```

**State Management Approach**:
- **Simple useState** (no complex logic)
- **No API calls needed** - just display error

**Key Flows**:
1. **Page Load**:
   - Extract query params (code, message, orderId)
   - Display error message
   - Provide retry and support links

**Components**:
- `PaymentFailPage` - Main component
- `ErrorDisplay` - Show error details
- `ActionButtons` - "다시 시도", "고객센터 문의"

**Common Error Codes**:
- `PAY_PROCESS_CANCELED`: User cancelled payment
- `PAY_PROCESS_ABORTED`: Payment aborted
- `INVALID_CARD_NUMBER`: Invalid card
- `EXCEED_MAX_AMOUNT`: Amount exceeded
- `REJECT_CARD_COMPANY`: Card company rejected

---

### 9. Account Management (`/account`)

**State Management**:
- **Clerk's `<UserProfile />` component** handles all state internally
- No custom state management needed
- Clerk handles profile editing, password changes, session management

**Implementation**:
```tsx
import { UserProfile } from "@clerk/nextjs";

export default function AccountPage() {
  return (
    <div className="container">
      <UserProfile />
    </div>
  );
}
```

**Clerk Features Used**:
- Profile information editing
- Password change
- Connected accounts
- Active sessions
- Account deletion

**Webhook Integration**:
- `user.updated`: Syncs changes to Supabase
- `user.deleted`: Removes user data and cancels subscription

---

## State Management Patterns Summary

### Pattern 1: Local useReducer
**Use When**:
- Complex state with multiple fields
- Multiple related actions
- Form management with validation

**Examples**: Dashboard, New Analysis, Subscription Management

### Pattern 2: Local useState
**Use When**:
- Simple state with few transitions
- No complex logic
- Independent state variables

**Examples**: Analysis Detail, Payment Fail

### Pattern 3: Global Context
**Use When**:
- State needed across multiple pages
- User authentication state
- Subscription status

**Examples**: UserContext

### Pattern 4: Server Components
**Use When**:
- Static content
- Initial data fetching
- No client interaction needed

**Examples**: Home page, Analysis detail (initial render)

---

## Data Fetching Strategy

### Client-Side Fetching
**Use For**:
- User-triggered actions (search, sort, pagination)
- Form submissions
- Real-time updates

**Implementation**:
- Use fetch API with `/api/` routes
- Handle loading, error, success states
- Update local state with results

### Server-Side Fetching
**Use For**:
- Initial page load data
- SEO-critical content
- Authentication-required pages

**Implementation**:
- Use Server Components
- Call Supabase directly
- Pass data as props to Client Components

---

## Error Handling Strategy

### Client-Side Errors
```typescript
// In reducer
case 'FETCH_ERROR':
  return {
    ...state,
    isLoading: false,
    error: action.payload,
  };

// In component
{state.error && (
  <ErrorMessage
    message={state.error}
    onRetry={() => dispatch({ type: 'FETCH_START' })}
  />
)}
```

### API Error Responses
```typescript
// Standard error format
{
  error: {
    code: 'INSUFFICIENT_ANALYSES',
    message: '분석 횟수가 부족합니다.',
    details?: any,
  }
}
```

### User-Friendly Messages
- Network errors: "네트워크 연결을 확인해주세요"
- Auth errors: "로그인이 필요합니다"
- Validation errors: Show inline field errors
- Server errors: "일시적인 오류가 발생했습니다"

---

## Loading States Strategy

### Skeleton Screens
**Use For**:
- Dashboard analysis list
- Subscription page payment history
- Initial page loads

### Spinners
**Use For**:
- Form submissions
- Button actions
- Short wait times (<2 seconds)

### Full-Screen Loading
**Use For**:
- Analysis generation (long operation)
- Payment processing
- Critical operations

---

## Form Validation Strategy

### Client-Side Validation
**Timing**:
- Real-time (onChange): Format validation only
- On blur: Full validation
- On submit: All fields validation

**Implementation**:
```typescript
// In reducer
case 'UPDATE_FIELD':
  const errors = validateField(action.payload.field, action.payload.value);
  return {
    ...state,
    formData: { ...state.formData, [action.payload.field]: action.payload.value },
    errors: { ...state.errors, ...errors },
  };
```

### Server-Side Validation
**Always validate on server** even if client validation passes
- Use Zod schemas
- Return validation errors to client
- Display server errors in UI

---

## Context Provider Hierarchy

```tsx
<html>
  <body>
    <ClerkProvider>
      <UserProvider> {/* Global UserContext */}
        <QueryClientProvider> {/* React Query for data fetching */}
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </UserProvider>
    </ClerkProvider>
  </body>
</html>
```

---

## Implementation Checklist

### Phase 1: Global State (Priority 1)
- [ ] Implement UserContext with reducer
- [ ] Create useUser hook
- [ ] Add UserProvider to layout
- [ ] Test user state updates

### Phase 2: Dashboard (Priority 2)
- [ ] Implement Dashboard reducer
- [ ] Add search and filter logic
- [ ] Test pagination
- [ ] Test sort functionality

### Phase 3: New Analysis (Priority 2)
- [ ] Implement form reducer
- [ ] Add field validation
- [ ] Implement submission flow
- [ ] Add loading screen
- [ ] Test error handling

### Phase 4: Subscription (Priority 3)
- [ ] Implement subscription reducer
- [ ] Add cancel/resume actions
- [ ] Fetch payment history
- [ ] Test state updates with UserContext

### Phase 5: Payment Flow (Priority 3)
- [ ] Implement upgrade page reducer
- [ ] Integrate Toss widget
- [ ] Implement success page flow
- [ ] Implement fail page display
- [ ] Test end-to-end payment

### Phase 6: Analysis Detail (Priority 4)
- [ ] Implement simple state management
- [ ] Add Markdown rendering
- [ ] Test error states

### Phase 7: Account (Priority 4)
- [ ] Integrate Clerk UserProfile
- [ ] Test webhook synchronization

---

## Testing Strategy

### Unit Tests
- Test reducers in isolation
- Test action creators
- Test validation functions
- Test state selectors

### Integration Tests
- Test component + reducer interactions
- Test context provider updates
- Test form submission flows
- Test error handling

### E2E Tests
- Test complete user journeys
- Test payment flow
- Test analysis creation flow
- Test subscription management

---

## Performance Considerations

### State Updates
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers
- Avoid unnecessary re-renders with React.memo

### Data Fetching
- Debounce search inputs (300ms)
- Implement pagination for large lists
- Cache API responses with React Query
- Use optimistic updates for instant feedback

### Code Splitting
- Lazy load payment widget
- Lazy load Markdown renderer
- Split routes with Next.js dynamic imports

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: State Planning Agent
**Next Steps**: Implement Priority 1 (UserContext) → Priority 2 (Dashboard + New Analysis)
