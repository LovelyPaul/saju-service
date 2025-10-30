# 테스트 환경 구축 최종 보고서

## 🎯 목표
Next.js 15 + TypeScript 프로젝트에 Vitest(단위) + Playwright(E2E) 테스트 환경 구축

## 📦 설치 명령어
```bash
# 단위 테스트
npm install -D vitest @vitest/ui @vitejs/plugin-react jsdom
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# API Mocking
npm install -D msw@latest

# E2E 테스트
npm install -D @playwright/test
npx playwright install chromium
```

## 📁 파일 구조
```
project/
├── tests/
│   ├── setup.ts                    # Vitest 전역 설정
│   ├── helpers/
│   │   └── test-utils.tsx          # React 렌더링 헬퍼
│   ├── mocks/
│   │   ├── handlers.ts             # MSW API 핸들러
│   │   └── server.ts               # MSW 서버 설정
│   └── e2e/
│       ├── auth.spec.ts            # 인증 플로우 E2E
│       └── analysis.spec.ts        # 사주 분석 E2E
├── src/
│   └── **/__tests__/*.test.tsx     # 단위/컴포넌트 테스트
├── vitest.config.ts
└── playwright.config.ts
```

## 🔧 설정 파일

### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next*', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.config.ts', 'src/app/layout.tsx', 'src/middleware.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### `playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### `tests/setup.ts`
```typescript
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Next.js Router Mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => '/',
}));

// Clerk Mock
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ isSignedIn: true, userId: 'test-user' }),
  SignInButton: ({ children }: any) => children,
  SignUpButton: ({ children }: any) => children,
  UserButton: () => null,
}));
```

### `tests/mocks/handlers.ts`
```typescript
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  // 사주 분석 생성
  http.post('/api/analyses/create', async ({ request }) => {
    const body = await request.json();
    if (!body.name || body.name.length < 2) {
      return HttpResponse.json({ message: '이름은 최소 2자 이상이어야 합니다' }, { status: 400 });
    }
    await delay(1000); // 실제 API 지연 시뮬레이션
    return HttpResponse.json({ success: true, analysisId: `mock-${Date.now()}` });
  }),

  // Hono 예제 API
  http.get('/api/example/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      fullName: 'Mock User',
      avatarUrl: 'https://picsum.photos/200',
      bio: 'Test bio',
      updatedAt: new Date().toISOString(),
    });
  }),

  // Toss 결제
  http.post('/api/payments/card', async ({ request }) => {
    const body = await request.json();
    if (body.cardNumber === '4111111111111111') {
      return HttpResponse.json({ success: true, orderId: 'MOCK_ORDER', paymentKey: 'MOCK_KEY' });
    }
    return HttpResponse.json({ error: '결제 실패' }, { status: 400 });
  }),

  // 구독 취소
  http.post('/api/subscription/cancel', () => {
    return HttpResponse.json({ success: true, message: '구독 취소 완료' });
  }),
];
```

### `tests/mocks/server.ts`
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

## 📝 테스트 작성 가이드

### 단위 테스트 예시: `src/utils/__tests__/subscription.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSubscriptionStatus } from '@/utils/subscription';
import type { User } from '@/types/user';

describe('calculateSubscriptionStatus', () => {
  const mockUser: User = {
    id: 'uuid', clerk_user_id: 'clerk123', email: 'test@test.com',
    first_name: 'Test', subscription_tier: 'free', subscription_ends_at: null,
    analyses_remaining: 3, cancelled_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };

  it('returns "free" for free tier', () => {
    const status = calculateSubscriptionStatus(mockUser);
    expect(status.type).toBe('free');
  });

  it('returns "pro_active" for active pro', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const proUser = { ...mockUser, subscription_tier: 'pro', subscription_ends_at: future.toISOString(), analyses_remaining: 10 };
    
    const status = calculateSubscriptionStatus(proUser);
    expect(status.type).toBe('pro_active');
    if (status.type === 'pro_active') expect(status.remaining).toBe(10);
  });
});
```

### 컴포넌트 테스트 예시: `src/components/ui/__tests__/button.test.tsx`
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders text correctly', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: /click/i })).toBeInTheDocument();
  });

  it('handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('disables when disabled prop', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E 테스트 예시: `tests/e2e/analysis.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Analysis Creation', () => {
  test('validates form input', async ({ page }) => {
    await page.goto('/analysis/new');
    
    await page.getByLabel(/이름/i).fill('홍');
    await expect(page.getByText(/이름은 최소 2자/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /분석 시작/i })).toBeDisabled();
  });

  test('creates analysis successfully', async ({ page }) => {
    await page.goto('/analysis/new');
    
    await page.getByLabel(/이름/i).fill('홍길동');
    await page.getByLabel(/생년월일/i).fill('1990-01-01');
    await page.locator('input[value="male"]').check();
    
    await page.getByRole('button', { name: /분석 시작/i }).click();
    
    await expect(page.getByText(/AI가 분석 중/i)).toBeVisible();
    await expect(page).toHaveURL(/\/analysis\/mock-\d+/, { timeout: 5000 });
    await expect(page.getByText(/홍길동님의 사주 분석/i)).toBeVisible();
  });
});
```

## 🚀 NPM 스크립트 추가 (`package.json`)
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## ✅ 구축 체크리스트

1. [ ] 패키지 설치 완료
2. [ ] `vitest.config.ts` 생성
3. [ ] `playwright.config.ts` 생성
4. [ ] `tests/setup.ts` 생성
5. [ ] `tests/mocks/handlers.ts` 생성
6. [ ] `tests/mocks/server.ts` 생성
7. [ ] 단위 테스트 예시 1개 작성 (`subscription.test.ts`)
8. [ ] 컴포넌트 테스트 예시 1개 작성 (`button.test.tsx`)
9. [ ] E2E 테스트 예시 1개 작성 (`analysis.spec.ts`)
10. [ ] `npm run test` 실행 확인
11. [ ] `npm run test:e2e` 실행 확인

## 🎯 핵심 원칙

1. **AAA 패턴**: Arrange(준비) → Act(실행) → Assert(검증)
2. **격리**: 각 테스트는 독립적으로 실행 가능
3. **명확한 이름**: `should_[expected]_when_[condition]` 형식
4. **모킹 최소화**: 실제 로직은 실제 코드로, 외부 의존성만 모킹
5. **실패 메시지**: `expect(value).toBe(expected)` 형식으로 명확한 실패 이유 제공

## ⚠️ 주의사항

- Clerk 실제 인증은 `tests/setup.ts`에서 모킹됨
- Supabase 호출은 MSW 핸들러에서 처리
- Gemini API 3~5분 지연은 `delay(1000)`로 단축
- E2E 테스트는 실제 dev 서버 필요 (자동 시작됨)
- CI/CD에서는 `retries: 2` 적용

---

**이 구성으로 단위 테스트와 E2E 테스트 환경이 완성됩니다. 각 파일을 정확히 생성하고 체크리스트를 따라 진행하세요.**