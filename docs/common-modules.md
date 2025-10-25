# 공통 모듈 계획 (Common Modules Plan)

## 문서 개요

본 문서는 사주 분석 서비스 개발 시 여러 페이지에서 공통으로 사용될 모듈을 정의합니다. 이 모듈들은 병렬 개발 시 코드 충돌을 최소화하고 일관성을 유지하기 위해 우선적으로 구현되어야 합니다.

**설계 원칙**:
- 요구사항에 명시된 기능만 포함 (NO 과도한 엔지니어링)
- 병렬 개발 시 충돌 가능성이 높은 모듈만 정의
- 페이지 독립적인 모듈 (특정 페이지에 종속되지 않음)

---

## 1. 타입 정의 (Types & Interfaces)

### 1.1 사용자 타입 (`/src/types/user.ts`)

**목적**: 전역에서 사용되는 사용자 관련 타입 정의

**주요 타입**:
```typescript
// 사용자 구독 티어
export type SubscriptionTier = 'free' | 'pro';

// 사용자 정보 (Database 타입)
export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  subscription_tier: SubscriptionTier;
  subscription_ends_at: string | null;
  analyses_remaining: number;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// 구독 상태 (계산된 상태)
export type SubscriptionStatus =
  | { type: 'free' }
  | { type: 'pro_active'; endsAt: Date; remaining: number }
  | { type: 'pro_cancelled'; endsAt: Date; remaining: number }
  | { type: 'pro_expired' };
```

**의존성**: 없음

**사용 위치**:
- Dashboard
- Subscription Management
- Analysis Pages
- API Routes

---

### 1.2 분석 타입 (`/src/types/analysis.ts`)

**목적**: 사주 분석 관련 타입 정의

**주요 타입**:
```typescript
// 성별
export type Gender = 'male' | 'female';

// AI 모델
export type ModelType = 'flash' | 'pro';

// 분석 정보 (Database 타입)
export interface Analysis {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string | null;
  is_lunar: boolean;
  gender: Gender;
  additional_info: string | null;
  analysis_result: string;
  model_used: ModelType;
  created_at: string;
}

// 새 분석 생성 입력
export interface CreateAnalysisInput {
  name: string;
  birth_date: string;
  birth_time?: string;
  is_lunar: boolean;
  gender: Gender;
  additional_info?: string;
}
```

**의존성**: 없음

**사용 위치**:
- Dashboard
- New Analysis Page
- Analysis Detail Page
- API Routes

---

### 1.3 결제 타입 (`/src/types/payment.ts`)

**목적**: 토스페이먼츠 결제 관련 타입 정의

**주요 타입**:
```typescript
// 결제 상태
export type PaymentStatus = 'done' | 'cancelled' | 'failed';

// 결제 정보 (Database 타입)
export interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  payment_key: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
}

// 빌링키 정보
export interface BillingKey {
  id: string;
  user_id: string;
  billing_key: string;
  created_at: string;
}

// 토스페이먼츠 결제 승인 요청
export interface TossPaymentConfirmRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}
```

**의존성**: 없음

**사용 위치**:
- Subscription Upgrade Page
- Payment Success/Fail Pages
- API Routes (Webhooks, Payment)

---

## 2. 데이터베이스 유틸리티

### 2.1 Supabase 타입 생성 (`/src/lib/supabase/database.types.ts`)

**목적**: Supabase 데이터베이스 스키마를 TypeScript 타입으로 자동 생성

**생성 방법**:
```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts
```

**주요 내용**:
- `Database` 타입: 전체 데이터베이스 스키마
- `Tables` 타입: 각 테이블의 Row, Insert, Update 타입

**의존성**: 없음 (자동 생성)

**사용 위치**: 모든 데이터베이스 쿼리

---

### 2.2 Supabase 쿼리 헬퍼 (`/src/lib/supabase/queries.ts`)

**목적**: 자주 사용되는 Supabase 쿼리 패턴을 재사용 가능한 함수로 제공

**주요 함수**:
```typescript
// 사용자 조회
export async function getUserByClerkId(supabase: SupabaseClient, clerkUserId: string): Promise<User | null>

// 사용자 구독 상태 조회
export async function getSubscriptionStatus(supabase: SupabaseClient, userId: string): Promise<SubscriptionStatus>

// 분석 목록 조회 (페이지네이션)
export async function getUserAnalyses(
  supabase: SupabaseClient,
  userId: string,
  options?: { limit?: number; offset?: number; search?: string }
): Promise<Analysis[]>

// 분석 상세 조회
export async function getAnalysisById(supabase: SupabaseClient, analysisId: string, userId: string): Promise<Analysis | null>

// 빌링키 조회
export async function getBillingKey(supabase: SupabaseClient, userId: string): Promise<BillingKey | null>
```

**의존성**:
- `/src/types/user.ts`
- `/src/types/analysis.ts`
- `/src/types/payment.ts`
- `/src/lib/supabase/database.types.ts`

**사용 위치**: 모든 Server Components 및 API Routes

---

## 3. 인증 관련 (Clerk)

### 3.1 Clerk 설정 (`/src/lib/clerk/config.ts`)

**목적**: Clerk 인증 설정 중앙 관리

**주요 내용**:
```typescript
export const CLERK_PUBLIC_ROUTES = ['/'];
export const CLERK_AUTH_ROUTES = ['/sign-in', '/sign-up'];

export const clerkConfig = {
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  secretKey: process.env.CLERK_SECRET_KEY!,
  webhookSecret: process.env.CLERK_WEBHOOK_SECRET!,
};
```

**의존성**: 없음

**사용 위치**:
- Middleware
- API Routes (Webhooks)

---

### 3.2 Clerk 헬퍼 (`/src/lib/clerk/helpers.ts`)

**목적**: Clerk 인증 관련 유틸리티 함수

**주요 함수**:
```typescript
// 현재 로그인한 사용자 Clerk ID 가져오기
export function getCurrentClerkUserId(): string | null

// Webhook 서명 검증
export async function verifyClerkWebhook(
  request: Request,
  webhookSecret: string
): Promise<WebhookEvent | null>
```

**의존성**:
- `@clerk/nextjs`

**사용 위치**:
- API Routes
- Server Components

---

## 4. 외부 API 클라이언트

### 4.1 Gemini API 클라이언트 (`/src/lib/gemini/client.ts`)

**목적**: Google Gemini API 호출 로직 캡슐화

**주요 함수**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export async function generateSajuAnalysis(input: {
  name: string;
  birthDate: string;
  birthTime?: string;
  isLunar: boolean;
  gender: Gender;
  additionalInfo?: string;
  model: GeminiModel;
}): Promise<string>
```

**의존성**:
- `@google/generative-ai` (설치 필요)
- `/src/types/analysis.ts`

**사용 위치**:
- New Analysis API Route

---

### 4.2 Gemini 프롬프트 (`/src/lib/gemini/prompts.ts`)

**목적**: Gemini API에 전달할 프롬프트 생성

**주요 함수**:
```typescript
export function generateSajuAnalysisPrompt(input: {
  name: string;
  birthDate: string;
  birthTime?: string;
  isLunar: boolean;
  gender: Gender;
  additionalInfo?: string;
}): string
```

**의존성**:
- `/src/types/analysis.ts`

**사용 위치**:
- `/src/lib/gemini/client.ts`

---

### 4.3 토스페이먼츠 클라이언트 (`/src/lib/toss/client.ts`)

**목적**: 토스페이먼츠 API 호출 로직 캡슐화

**주요 함수**:
```typescript
// 결제 승인
export async function confirmPayment(data: TossPaymentConfirmRequest): Promise<any>

// 빌링키로 결제
export async function payWithBillingKey(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<any>

// 빌링키 삭제
export async function deleteBillingKey(billingKey: string): Promise<void>
```

**의존성**:
- `/src/types/payment.ts`

**사용 위치**:
- Payment Confirm API Route
- Recurring Payment Cron Job
- User Deletion Webhook

---

## 5. Validation (Zod Schemas)

### 5.1 분석 입력 스키마 (`/src/schemas/analysis.ts`)

**목적**: 새 분석 생성 시 입력값 검증

**주요 스키마**:
```typescript
import { z } from 'zod';

export const createAnalysisSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  is_lunar: z.boolean(),
  gender: z.enum(['male', 'female']),
  additional_info: z.string().max(500).optional(),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
```

**의존성**:
- `zod`

**사용 위치**:
- New Analysis Page (클라이언트 검증)
- New Analysis API Route (서버 검증)

---

### 5.2 결제 입력 스키마 (`/src/schemas/payment.ts`)

**목적**: 결제 승인 요청 검증

**주요 스키마**:
```typescript
export const paymentConfirmSchema = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

export type PaymentConfirmInput = z.infer<typeof paymentConfirmSchema>;
```

**의존성**:
- `zod`

**사용 위치**:
- Payment Success Page
- Payment Confirm API Route

---

## 6. Constants

### 6.1 앱 상수 (`/src/constants/app.ts`)

**목적**: 앱 전체에서 사용되는 상수 정의

**주요 상수**:
```typescript
// 구독 관련
export const SUBSCRIPTION = {
  FREE_ANALYSES_COUNT: 3,
  PRO_ANALYSES_COUNT: 10,
  PRO_PRICE: 3900,
  PRO_DURATION_DAYS: 30,
} as const;

// 모델 매핑
export const MODEL_BY_TIER = {
  free: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro',
} as const;

// API 타임아웃
export const API_TIMEOUT = {
  GEMINI: 60000, // 60초
  PAYMENT: 30000, // 30초
} as const;
```

**의존성**: 없음

**사용 위치**: 모든 페이지 및 API Routes

---

### 6.2 환경 변수 스키마 확장 (`/src/constants/env.ts`)

**목적**: 기존 환경 변수 스키마에 추가 환경 변수 정의

**추가 필요 변수**:
```typescript
const envSchema = z.object({
  // 기존 Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  // Toss Payments
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: z.string().min(1),
  TOSS_PAYMENTS_SECRET_KEY: z.string().min(1),
  TOSS_PAYMENTS_WEBHOOK_SECRET: z.string().min(1),

  // Gemini API
  GOOGLE_GEMINI_API_KEY: z.string().min(1),

  // Cron Job
  CRON_SECRET: z.string().min(1),
});
```

**의존성**:
- `zod`

**사용 위치**: 모든 환경 변수 접근 시

---

## 7. Hooks (React)

### 7.1 useUser Hook (`/src/hooks/useUser.ts`)

**목적**: 현재 로그인한 사용자 정보 및 구독 상태 제공

**주요 기능**:
```typescript
export function useUser() {
  return {
    user: User | null,
    subscriptionStatus: SubscriptionStatus,
    isLoading: boolean,
    error: Error | null,
    refresh: () => Promise<void>,
  };
}
```

**의존성**:
- `/src/types/user.ts`
- `@tanstack/react-query`

**사용 위치**:
- Dashboard
- Subscription Management
- New Analysis Page

---

### 7.2 useAnalyses Hook (`/src/hooks/useAnalyses.ts`)

**목적**: 사용자의 분석 목록 조회 및 검색

**주요 기능**:
```typescript
export function useAnalyses(options?: { search?: string }) {
  return {
    analyses: Analysis[],
    isLoading: boolean,
    error: Error | null,
    refetch: () => void,
  };
}
```

**의존성**:
- `/src/types/analysis.ts`
- `@tanstack/react-query`

**사용 위치**:
- Dashboard

---

## 8. 공통 UI 컴포넌트

### 8.1 로딩 컴포넌트 (`/src/components/common/Loading.tsx`)

**목적**: 일관된 로딩 UI 제공

**주요 Props**:
```typescript
interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}
```

**의존성**:
- `lucide-react` (Loader2 아이콘)

**사용 위치**:
- New Analysis Page
- Dashboard
- 모든 비동기 작업

---

### 8.2 에러 메시지 컴포넌트 (`/src/components/common/ErrorMessage.tsx`)

**목적**: 일관된 에러 표시 UI 제공

**주요 Props**:
```typescript
interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}
```

**의존성**:
- `lucide-react` (AlertCircle 아이콘)
- `/src/components/ui/button.tsx`

**사용 위치**: 모든 페이지

---

### 8.3 구독 상태 카드 (`/src/components/subscription/SubscriptionCard.tsx`)

**목적**: 사용자의 구독 상태 및 남은 횟수 표시

**주요 Props**:
```typescript
interface SubscriptionCardProps {
  status: SubscriptionStatus;
  analysesRemaining: number;
}
```

**의존성**:
- `/src/types/user.ts`
- `/src/components/ui/card.tsx`
- `/src/components/ui/badge.tsx`

**사용 위치**:
- Dashboard
- Subscription Management Page

---

## 9. 유틸리티 함수

### 9.1 날짜 포맷 (`/src/utils/date.ts`)

**목적**: 일관된 날짜 표시 형식

**주요 함수**:
```typescript
// "2025-01-15" → "2025년 1월 15일"
export function formatDate(dateString: string): string

// "2025-01-15T10:30:00Z" → "2025년 1월 15일 10:30"
export function formatDateTime(dateString: string): string

// "2025-01-15T10:30:00Z" → "3일 전"
export function formatRelativeTime(dateString: string): string
```

**의존성**:
- `date-fns`

**사용 위치**:
- Dashboard (분석 목록)
- Subscription Management (결제일 표시)
- Analysis Detail Page

---

### 9.2 에러 핸들링 (`/src/utils/error.ts`)

**목적**: API 에러를 사용자 친화적 메시지로 변환

**주요 함수**:
```typescript
export function getErrorMessage(error: unknown): string

export function isApiError(error: unknown): error is ApiError

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};
```

**의존성**: 없음

**사용 위치**: 모든 API 호출 에러 처리

---

### 9.3 구독 상태 계산 (`/src/utils/subscription.ts`)

**목적**: User 데이터로부터 구독 상태 계산

**주요 함수**:
```typescript
export function calculateSubscriptionStatus(user: User): SubscriptionStatus
```

**의존성**:
- `/src/types/user.ts`

**사용 위치**:
- useUser Hook
- Server Components

---

## 10. 백엔드 미들웨어

### 10.1 인증 미들웨어 (`/src/backend/middleware/auth.ts`)

**목적**: API 라우트에서 Clerk 인증 확인

**주요 함수**:
```typescript
export async function requireAuth(c: Context): Promise<string | Response>
// Returns: Clerk User ID or 401 Response
```

**의존성**:
- `@clerk/nextjs`
- Hono

**사용 위치**:
- 모든 인증이 필요한 API Routes

---

### 10.2 구독 확인 미들웨어 (`/src/backend/middleware/subscription.ts`)

**목적**: 분석 생성 API에서 사용자의 분석 횟수 확인

**주요 함수**:
```typescript
export async function requireAnalysesRemaining(c: Context): Promise<void | Response>
// Returns: void or 403 Response
```

**의존성**:
- `/src/lib/supabase/queries.ts`
- Hono

**사용 위치**:
- New Analysis API Route

---

## 구현 우선순위 (Implementation Priority)

### Priority 1 - Critical (병렬 개발 전 필수)

이 모듈들은 **모든 페이지에서 공통으로 사용**되므로 가장 먼저 구현되어야 합니다.

1. **타입 정의** (모든 `/src/types/*.ts`)
   - `/src/types/user.ts`
   - `/src/types/analysis.ts`
   - `/src/types/payment.ts`

2. **환경 변수 확장**
   - `/src/constants/env.ts`
   - `/src/constants/app.ts`

3. **Supabase 타입 및 쿼리**
   - `/src/lib/supabase/database.types.ts` (자동 생성)
   - `/src/lib/supabase/queries.ts`

4. **Validation Schemas**
   - `/src/schemas/analysis.ts`
   - `/src/schemas/payment.ts`

5. **유틸리티 함수**
   - `/src/utils/date.ts`
   - `/src/utils/error.ts`
   - `/src/utils/subscription.ts`

**이유**: 이 모듈들은 타입 안정성과 코드 일관성을 보장하며, 모든 페이지 개발의 기반이 됩니다.

---

### Priority 2 - Important (페이지 개발과 병렬 가능)

이 모듈들은 페이지 개발과 동시에 진행 가능하지만, 빠르게 완성해야 중복 작업을 방지할 수 있습니다.

6. **Clerk 설정 및 헬퍼**
   - `/src/lib/clerk/config.ts`
   - `/src/lib/clerk/helpers.ts`

7. **외부 API 클라이언트**
   - `/src/lib/gemini/client.ts`
   - `/src/lib/gemini/prompts.ts`
   - `/src/lib/toss/client.ts`

8. **백엔드 미들웨어**
   - `/src/backend/middleware/auth.ts`
   - `/src/backend/middleware/subscription.ts`

9. **React Hooks**
   - `/src/hooks/useUser.ts`
   - `/src/hooks/useAnalyses.ts`

**이유**: 페이지 개발 중 API 호출이나 인증 로직이 필요한 시점에 준비되어 있어야 합니다.

---

### Priority 3 - Nice-to-have (나중에 추가 가능)

이 모듈들은 페이지 개발 후에도 추가할 수 있으며, 초기에는 인라인 구현으로 대체 가능합니다.

10. **공통 UI 컴포넌트**
    - `/src/components/common/Loading.tsx`
    - `/src/components/common/ErrorMessage.tsx`
    - `/src/components/subscription/SubscriptionCard.tsx`

**이유**: UI 컴포넌트는 각 페이지에서 먼저 개발한 후, 공통 패턴을 추출하여 리팩토링하는 것이 더 효율적입니다.

---

## 검증 체크리스트 (Verification Checklist)

개발 시작 전 다음 항목을 3번 검증하세요:

### 체크리스트 1: 충돌 방지 검증
- [ ] 모든 공통 타입이 정의되었는가?
- [ ] 데이터베이스 쿼리 패턴이 일관되는가?
- [ ] API 클라이언트가 중앙화되었는가?
- [ ] Validation 스키마가 클라이언트/서버에서 재사용 가능한가?

### 체크리스트 2: 과도한 엔지니어링 방지
- [ ] 모든 모듈이 요구사항에 명시된 기능과 연결되는가?
- [ ] "혹시 필요할 수도"라는 이유로 추가된 모듈은 없는가?
- [ ] 각 모듈이 최소 2개 이상의 페이지에서 사용되는가?

### 체크리스트 3: 병렬 개발 가능성
- [ ] Priority 1 모듈들이 모두 구현되었는가?
- [ ] 각 페이지 개발자가 독립적으로 작업할 수 있는가?
- [ ] 타입 충돌 없이 병합 가능한가?

---

## 추가 설치 필요 패키지

```bash
npm install @google/generative-ai @clerk/nextjs
```

---

## 디렉토리 구조 요약

```
src/
├── types/                      # 공통 타입 정의
│   ├── user.ts
│   ├── analysis.ts
│   └── payment.ts
│
├── lib/                        # 외부 라이브러리 통합
│   ├── supabase/
│   │   ├── database.types.ts  # 자동 생성
│   │   └── queries.ts
│   ├── clerk/
│   │   ├── config.ts
│   │   └── helpers.ts
│   ├── gemini/
│   │   ├── client.ts
│   │   └── prompts.ts
│   └── toss/
│       └── client.ts
│
├── schemas/                    # Zod validation
│   ├── analysis.ts
│   └── payment.ts
│
├── constants/                  # 상수
│   ├── env.ts                 # 환경 변수 (확장)
│   └── app.ts                 # 앱 상수
│
├── utils/                      # 유틸리티 함수
│   ├── date.ts
│   ├── error.ts
│   └── subscription.ts
│
├── hooks/                      # React Hooks
│   ├── useUser.ts
│   └── useAnalyses.ts
│
├── components/
│   ├── common/                # 공통 UI
│   │   ├── Loading.tsx
│   │   └── ErrorMessage.tsx
│   └── subscription/
│       └── SubscriptionCard.tsx
│
└── backend/
    └── middleware/            # API 미들웨어
        ├── auth.ts
        └── subscription.ts
```

---

## 마무리

본 문서에 정의된 공통 모듈들은 **요구사항에 명시된 기능만** 포함하며, **병렬 개발 시 충돌을 방지**하기 위한 최소한의 공통 레이어입니다.

**중요**:
- Priority 1 모듈 완성 후 페이지 개발 시작
- 추가 공통 모듈이 필요하다면, 실제 중복 코드가 발생한 후 리팩토링으로 추출
- "혹시 필요할 수도"라는 이유로 모듈을 추가하지 말 것

---

**문서 버전**: v1.0
**작성일**: 2025-10-25
**작성자**: Common Task Planner Agent
**다음 단계**: Priority 1 모듈 구현 → 페이지별 Task 분배
