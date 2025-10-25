# Next.js 14 풀스택 프로젝트: Clerk & 토스페이먼츠 구독결제 연동 최종 가이드

**작성일:** 2025년 10월 25일
**대상 기술:** Next.js 14.x (App Router, LTS), Clerk (인증), 토스페이먼츠 (구독결제), Supabase (데이터베이스)

본 문서는 Next.js 풀스택 프로젝트에 사용자 인증/관리(Clerk) 및 구독결제(토스페이먼츠) 기능을 연동하기 위한 상세 가이드입니다. 각 서비스의 SDK, API, Webhook을 활용하는 방법을 다루며, 최신 LTS 버전과 모범 사례를 따릅니다.

## 1. 프로젝트 개요 및 요구사항 요약

*   **Next.js 환경:** App Router 기반의 Next.js 14.x (LTS)
*   **인증:** Clerk을 통한 사용자 로그인, 회원가입, 계정 관리
    *   Clerk 기본 UI 사용 (SignIn, SignUp 컴포넌트)
    *   홈 외 모든 페이지는 인증된 사용자만 접근 가능
    *   Clerk 사용자 정보를 Supabase 데이터베이스와 동기화 (역할 할당, 초기 데이터 생성 포함)
*   **결제:** 토스페이먼츠 구독결제 (Pro 요금제 업그레이드)
    *   토스페이먼츠 결제 위젯 UI 사용
    *   매월 정기 결제가 아닌, Pro 요금제 업그레이드 시 **수동 결제 (재결제/연장 시에도 수동 요청)**
    *   결제 실패 시 재시도 로직 및 월 구독 만료 처리 기능
    *   사용자가 구독 관리 페이지에서 구독 연장 및 환불 가능
*   **데이터베이스:** Supabase 활용

## 2. Clerk 연동 가이드

Clerk은 Next.js 애플리케이션의 인증 및 사용자 관리를 위한 풀스택 솔루션입니다. SDK와 Webhook을 핵심적으로 활용하여 연동합니다.

### 2.1. 연동할 수단: SDK, Webhook (선택적 API)

*   **SDK (`@clerk/nextjs`):** Next.js의 클라이언트/서버 컴포넌트, 미들웨어, API 라우트에서 사용자 인증 상태 관리, UI 렌더링, 사용자 정보 접근에 필수적으로 사용됩니다.
*   **Webhook:** 사용자 계정 생성, 업데이트, 삭제 이벤트 발생 시 Supabase 데이터베이스와 사용자 정보를 동기화하고 초기 비즈니스 로직(예: 역할 할당)을 처리하는 데 필수적으로 사용됩니다.
*   **API (Backend SDK):** 특정 어드민 기능(예: 어드민 페이지에서 사용자 역할 강제 변경)이 필요한 경우에 한해 서버 사이드에서 `clerkClient`를 통해 직접 호출할 수 있습니다. 본 프로젝트에서는 Webhook을 통해 대부분의 백엔드 로직을 처리하므로, 직접적인 API 호출은 제한적으로 사용될 수 있습니다.

### 2.2. 각 수단별 사용할 기능

*   **SDK:**
    *   **클라이언트 컴포넌트:** `<ClerkProvider>`, `<SignIn />`, `<SignUp />`, `<UserButton />`, `useUser()` 훅 등 Clerk UI 컴포넌트 렌더링 및 클라이언트에서 사용자 정보 접근.
    *   **서버 컴포넌트:** `currentUser()` 헬퍼 함수를 통한 서버에서 사용자 정보 조회 (예: 대시보드 데이터 로딩).
    *   **API 라우트:** `auth()` 헬퍼 함수를 통한 서버에서 인증 상태 확인 및 `clerkClient`를 통한 사용자 관리 (예: 어드민 기능).
    *   **미들웨어:** `authMiddleware`를 통한 라우트 보호 및 인증되지 않은 사용자 리다이렉션.
*   **Webhook:**
    *   `user.created`: 새로운 사용자 가입 시 Supabase `users` 테이블에 사용자 정보 생성 및 `free_tier` 역할 할당.
    *   `user.updated`: 사용자 프로필 정보 변경 시 Supabase `users` 테이블 업데이트.
    *   `user.deleted`: 사용자 계정 삭제 시 Supabase `users` 테이블 및 관련 데이터 삭제 (토스페이먼츠 구독 취소 로직 트리거 포함).

### 2.3. 설치/세팅 방법

1.  **라이브러리 설치:**
    ```bash
    npm install @clerk/nextjs svix
    ```
2.  **환경 변수 설정 (`.env.local`):**
    *   Clerk 대시보드에서 API 키(`Publishable Key`, `Secret Key`) 및 Webhook Secret 발급.
    *   각 키를 `.env.local` 파일에 추가합니다.
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
    CLERK_SECRET_KEY=sk_live_YOUR_SECRET_KEY
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
    CLERK_WEBHOOK_SECRET=whsec_YOUR_CLERK_WEBHOOK_SECRET
    ```
3.  **애플리케이션 감싸기 (`app/layout.tsx`):**
    `ClerkProvider`로 Next.js 애플리케이션을 감싸 인증 컨텍스트를 제공합니다.
    ```typescript jsx
    import { ClerkProvider } from '@clerk/nextjs';
    export default function RootLayout({ children }: { children: React.ReactNode }) {
      return (
        <ClerkProvider>
          <html lang="en"><body>{children}</body></html>
        </ClerkProvider>
      );
    }
    ```
4.  **미들웨어 설정 (`middleware.ts`):**
    `authMiddleware`를 사용하여 접근 권한을 제어합니다. Webhook 경로는 `publicRoutes`에 포함하여 인증 없이 접근 가능하게 합니다.
    ```typescript
    import { authMiddleware } from '@clerk/nextjs';
    export default authMiddleware({
      publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhook/clerk', '/api/webhook/tosspayments'],
    });
    export const config = {
      matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
    };
    ```

### 2.4. 인증 정보 관리 방법

*   **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`:** 클라이언트 측에서 사용되는 공개 키입니다. `.env.local`에 `NEXT_PUBLIC_` 접두사를 사용하여 클라이언트 번들에 포함되도록 합니다. GitHub 등 버전 관리 시스템에 노출되어도 안전합니다.
*   **`CLERK_SECRET_KEY`:** 서버 측에서만 사용되는 비밀 키입니다. `.env.local`에 저장하고, 절대 클라이언트 코드나 프론트엔드 환경에 노출되지 않도록 엄격하게 관리해야 합니다. GitHub 등에는 절대 커밋하지 않습니다.
*   **`CLERK_WEBHOOK_SECRET`:** Webhook 요청의 무결성을 검증하는 데 사용되는 비밀 문자열입니다. `.env.local`에 저장하고, `CLERK_SECRET_KEY`와 동일하게 엄격하게 관리합니다.

### 2.5. 호출 방법 (예시)

*   **SDK (클라이언트 컴포넌트 `components/UserMenu.tsx`):**
    ```typescript jsx
    import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
    export default function UserMenu() {
      return (
        <>
          <SignedIn><UserButton afterSignOutUrl="/" /></SignedIn>
          <SignedOut><SignInButton mode="modal" /></SignedOut>
        </>
      );
    }
    ```
*   **SDK (서버 컴포넌트 `app/dashboard/page.tsx`):**
    ```typescript jsx
    import { currentUser } from '@clerk/nextjs/server';
    export default async function DashboardPage() {
      const user = await currentUser(); // 서버에서 사용자 정보 조회
      return <h1>Welcome, {user?.firstName}!</h1>;
    }
    ```
*   **Webhook (`app/api/webhook/clerk/route.ts`):**
    `svix` 라이브러리를 사용하여 요청 서명을 검증하고, 이벤트 타입에 따라 Supabase와 사용자 데이터를 동기화합니다.
    ```typescript
    import { Webhook } from 'svix';
    import { headers } from 'next/headers';
    import { NextResponse } from 'next/server';
    import { createClient } from '@/utils/supabase/server'; // Supabase 클라이언트

    export async function POST(req: Request) {
      const svix_id = headers().get('svix-id'); // ... 헤더 검증 로직
      const body = JSON.stringify(await req.json());
      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET; // 환경 변수에서 secret 가져옴

      const wh = new Webhook(webhookSecret!);
      let evt; try { evt = wh.verify(body, { 'svix-id': svix_id!, /* ... */ }) as WebhookEvent; } catch (err) { /* ... */ }

      const eventType = evt.type;
      const supabase = createClient();

      switch (eventType) {
        case 'user.created':
          const { id, email_addresses, first_name } = evt.data;
          await supabase.from('users').insert({ clerk_user_id: id, email: email_addresses[0].email_address, first_name, role: 'free_tier' });
          break;
        case 'user.deleted':
          const deletedUserId = evt.data.id;
          await supabase.from('users').delete().eq('clerk_user_id', deletedUserId);
          // 여기에 토스페이먼츠 구독 취소 로직 추가 가능
          break;
        // ... user.updated 등 처리
      }
      return new NextResponse('Webhook processed', { status: 200 });
    }
    ```

## 3. 토스페이먼츠 구독결제 연동 가이드

토스페이먼츠 연동은 클라이언트에서 결제 위젯을 띄우고, 백엔드(Next.js API 라우트)에서 결제 승인, 빌링키 관리, 환불 등을 처리하며, Webhook으로 결제 상태를 동기화하는 방식으로 진행됩니다.

### 3.1. 연동할 수단: SDK, API, Webhook

*   **SDK (`@tosspayments/payment-widget-sdk`):** 클라이언트 측에서 토스페이먼츠 결제 위젯을 렌더링하고 사용자로부터 결제 정보를 받아 결제 요청을 시작하는 데 사용됩니다.
*   **API (서버 API):** Next.js API 라우트(백엔드)에서 결제 승인, 빌링키 발급/관리, 수동 결제 재시도/연장, 환불 처리 등 모든 핵심 결제 로직에 사용됩니다. 보안 및 비즈니스 로직 관리를 위해 필수적입니다.
*   **Webhook:** 결제 상태 변경(성공, 실패, 취소 등) 이벤트 발생 시 Next.js API 라우트로 알림을 받아 Supabase의 사용자 구독 상태를 동기화하고, 결제 실패 시 재시도 트리거, 구독 만료 처리 등의 백엔드 로직을 수행하는 데 필수적으로 사용됩니다.

### 3.2. 각 수단별 사용할 기능

*   **SDK:**
    *   `loadPaymentWidget()`: 결제 위젯 로드 및 초기화.
    *   `renderPaymentMethods()`: 결제 수단 선택 UI 렌더링.
    *   `renderAgreement()`: 결제 동의 UI 렌더링.
    *   `requestPayment()`: 결제 요청 시작 (성공/실패 콜백 URL 지정).
*   **API:**
    *   `POST /v1/payments/confirm`: 클라이언트에서 전달받은 `paymentKey`, `orderId`, `amount`로 결제 최종 승인 및 빌링키 발급.
    *   `POST /v1/payments/{paymentKey}/cancel`: 특정 `paymentKey` 결제를 취소(환불).
    *   `POST /v1/billing/subscriptions/{billingKey}`: 저장된 빌링키를 사용하여 수동으로 결제를 요청 (구독 연장/재시도).
    *   `GET /v1/payments/{paymentKey}` 또는 `GET /v1/payments?orderId={orderId}`: 결제 내역 조회 (필요시).
*   **Webhook:**
    *   `PAYMENT_STATUS_DONE`: 결제 성공 시 Supabase의 `payments` 테이블 업데이트 및 사용자 구독 기간 연장.
    *   `PAYMENT_STATUS_CANCELLED`: 결제 취소/환불 시 Supabase `payments` 테이블 업데이트 및 사용자 구독 상태 변경(`cancelled`, `inactive` 등).
    *   `PAYMENT_STATUS_FAILED`: 결제 실패 시 Supabase `payments` 테이블 업데이트 및 사용자에게 재결제 유도 알림.
    *   `PAYMENT_STATUS_EXPIRED`: 결제 유효 기간 만료 시 처리.

### 3.3. 설치/세팅 방법

1.  **라이브러리 설치:**
    ```bash
    npm install @tosspayments/payment-widget-sdk uuid # uuid는 orderId 생성을 위함
    ```
2.  **환경 변수 설정 (`.env.local`):**
    *   토스페이먼츠 상점 관리자에서 API 키(`클라이언트 키`, `시크릿 키`) 및 Webhook Secret 발급.
    *   각 키를 `.env.local` 파일에 추가합니다.
    ```env
    NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY=test_ck_YOUR_CLIENT_KEY
    TOSS_PAYMENTS_SECRET_KEY=test_sk_YOUR_SECRET_KEY
    TOSS_PAYMENTS_WEBHOOK_SECRET=YOUR_TOSS_PAYMENTS_WEBHOOK_SECRET
    ```
3.  **Webhook 등록:**
    *   토스페이먼츠 상점 관리자 > 개발자 설정 > Webhook 설정에서 Webhook URL (`https://your-domain.com/api/webhook/tosspayments`)을 등록하고, 필요한 이벤트(결제 성공, 실패, 취소 등)를 구독합니다.
    *   발급된 **`Webhook Secret`**을 `.env.local`의 `TOSS_PAYMENTS_WEBHOOK_SECRET`에 추가합니다.

### 3.4. 인증 정보 관리 방법

*   **`NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY`:** 클라이언트 측에서 결제 위젯 초기화에 사용되는 공개 키입니다. `.env.local`에 `NEXT_PUBLIC_` 접두사를 사용하여 관리합니다. 외부에 노출되어도 안전합니다.
*   **`TOSS_PAYMENTS_SECRET_KEY`:** 서버 측에서 결제 승인, 빌링키 발급, 환불 등 모든 민감한 API 호출에 사용되는 비밀 키입니다. `.env.local`에 저장하고, Node.js `Buffer`를 사용하여 Base64 인코딩 후 `Basic` 인증 헤더에 포함시켜 요청합니다. 절대 외부에 노출되지 않도록 엄격하게 관리해야 합니다.
*   **`TOSS_PAYMENTS_WEBHOOK_SECRET`:** 토스페이먼츠 Webhook 요청의 무결성을 검증하는 데 사용되는 비밀 문자열입니다. `.env.local`에 저장하고, 요청 바디와 함께 `crypto` 모듈을 사용하여 HMAC SHA256 서명을 검증하는 데 사용됩니다. `TOSS_PAYMENTS_SECRET_KEY`와 동일하게 엄격하게 관리합니다.

### 3.5. 호출 방법 (예시)

*   **SDK (클라이언트 컴포넌트 `components/PaymentWidget.tsx`):**
    ```typescript jsx
    'use client';
    import { useEffect, useRef, useCallback } from 'react';
    import { loadPaymentWidget, ANONYMOUS } from '@tosspayments/payment-widget-sdk';
    import { useUser } from '@clerk/nextjs'; // Clerk 사용자 ID 활용
    import { useRouter } from 'next/navigation';

    const clientKey = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY!;

    export default function PaymentWidget({ amount, orderId, orderName, customerName, customerEmail }) {
      const paymentWidgetRef = useRef<ReturnType<typeof loadPaymentWidget> | null>(null);
      const { user } = useUser();
      const router = useRouter();

      useEffect(() => {
        (async () => {
          const customerKey = user?.id || ANONYMOUS; // Clerk User ID를 customerKey로 사용
          const paymentWidget = await loadPaymentWidget(clientKey, customerKey);
          paymentWidgetRef.current = paymentWidget;
          paymentWidget.renderPaymentMethods('#payment-widget', { value: amount });
          paymentWidget.renderAgreement('#agreement-widget');
        })();
      }, [amount, user?.id]);

      const handlePayment = useCallback(async () => {
        const paymentWidget = paymentWidgetRef.current;
        if (!paymentWidget) return;
        try {
          await paymentWidget.requestPayment({
            orderId, orderName, customerName, customerEmail,
            successUrl: `${window.location.origin}/success`,
            failUrl: `${window.location.origin}/fail`,
          });
        } catch (error) { console.error('결제 요청 에러:', error); }
      }, [orderId, orderName, customerName, customerEmail]);

      return (
        <div>
          <div id="payment-widget" />
          <div id="agreement-widget" />
          <button onClick={handlePayment}>결제하기</button>
        </div>
      );
    }
    ```
*   **API (서버 API 라우트 `app/api/payments/confirm/route.ts`):**
    결제 위젯으로부터 받은 정보를 최종 승인하고 Supabase를 업데이트합니다.
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/utils/supabase/server';
    import { Buffer } from 'buffer'; // Node.js Buffer 필요

    export async function POST(req: Request) {
      const { paymentKey, orderId, amount, userId } = await req.json(); // userId는 Clerk User ID
      // ... 유효성 검사

      const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY + ':';
      const encodedSecret = Buffer.from(secretKey).toString('base64');
      const authHeader = `Basic ${encodedSecret}`;

      try {
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const paymentResult = await response.json();

        if (response.ok) {
          const supabase = createClient();
          // 1. Supabase 'payments' 테이블에 결제 정보 저장
          // 2. paymentResult.billingKey가 있다면 'billing_keys' 테이블에 빌링키 저장 (onConflict로 업데이트)
          // 3. 'users' 테이블의 해당 userId 구독 상태(subscription_status, subscription_tier, subscription_ends_at) 업데이트
          return NextResponse.json(paymentResult);
        } else {
          // ... 결제 실패 처리
          return new NextResponse(JSON.stringify({ message: paymentResult.message }), { status: response.status });
        }
      } catch (error) { /* ... */ }
    }
    ```
*   **Webhook (`app/api/webhook/tosspayments/route.ts`):**
    토스페이먼츠로부터 결제 상태 변경 알림을 받아 Supabase의 구독 상태를 동기화합니다.
    ```typescript
    import { NextResponse } from 'next/server';
    import { createClient } from '@/utils/supabase/server';
    import crypto from 'crypto';

    export async function POST(req: Request) {
      const tossWebhookSecret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET!;
      const rawBody = await req.text();
      const signature = req.headers.get('x-tosspayments-webhook-secret');

      const expectedSignature = crypto.createHmac('sha256', tossWebhookSecret).update(rawBody).digest('base64');
      if (signature !== expectedSignature) { return new NextResponse('Invalid signature', { status: 401 }); }

      const event = JSON.parse(rawBody);
      const eventType = event.eventType;
      const data = event.data; // 결제 관련 데이터
      const supabase = createClient();

      try {
        switch (eventType) {
          case 'PAYMENT_STATUS_DONE': // 결제 성공
            // payments 테이블 및 users 테이블의 구독 상태 업데이트 (기간 연장 등)
            break;
          case 'PAYMENT_STATUS_CANCELLED': // 결제 취소/환불
            // payments 테이블 및 users 테이블의 구독 상태 변경 (cancelled, inactive)
            break;
          case 'PAYMENT_STATUS_FAILED': // 결제 실패
            // payments 테이블 업데이트 및 사용자에게 알림
            break;
          // ... 기타 이벤트 처리
        }
      } catch (error) { /* ... */ }
      return new NextResponse('Webhook processed', { status: 200 });
    }
    ```