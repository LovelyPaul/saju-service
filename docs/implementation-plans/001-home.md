# Implementation Plan: Home Page

## 1. Overview

- **Purpose**: Landing page that introduces the service, displays features, pricing, and FAQs to attract new users
- **Route**: `/`
- **Auth**: Not required (public page)
- **Related Usecases**: N/A (Entry point to UC-001 signup)

## 2. File Structure

```
src/app/
├── page.tsx                    # Server Component (Landing Page)
├── components/
│   ├── HeroSection.tsx        # Client Component
│   ├── FeaturesSection.tsx    # Server Component
│   ├── PricingSection.tsx     # Server Component
│   └── FAQSection.tsx         # Client Component (accordion)
└── layout.tsx                  # Root layout (already exists)
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Landing Page)
- **Type**: Server Component
- **Purpose**: Compose all sections of the landing page
- **Data**: Static content (no DB queries)
- **Props**: None
- **Structure**:
  ```tsx
  <main>
    <HeroSection />
    <FeaturesSection />
    <PricingSection />
    <FAQSection />
  </main>
  ```

**FeaturesSection.tsx**
- **Type**: Server Component (static content)
- **Purpose**: Display service features (4 cards)
- **Props**: None
- **Content**:
  - AI 기반 정확한 분석
  - 합리적인 가격
  - 분석 내역 보관 및 관리
  - 간편한 Google 로그인

**PricingSection.tsx**
- **Type**: Server Component
- **Purpose**: Display pricing comparison table (Free vs Pro)
- **Props**: None
- **Data**: Uses `/src/constants/app.ts` (SUBSCRIPTION constants)
- **Content**:
  - Free: 0원, 3회, Gemini Flash
  - Pro: 3,900원/월, 10회/월, Gemini Pro

### 3.2 Client Components

**HeroSection.tsx**
- **Type**: Client Component
- **Purpose**: Hero section with CTA button
- **Props**: None
- **Interactivity**: CTA button click → redirect to signup
- **Content**:
  - Heading: "AI가 분석하는 나의 사주"
  - Subheading: "Google Gemini 기반, 전문적이고 상세한 사주 분석"
  - CTA Button: "무료로 시작하기" → `/sign-up`

**FAQSection.tsx**
- **Type**: Client Component
- **Purpose**: FAQ with accordion
- **Props**: None
- **Interactivity**: Accordion expand/collapse
- **Questions** (from PRD):
  1. 무료 체험은 몇 번까지 가능한가요?
  2. Pro 구독은 어떻게 결제하나요?
  3. 출생 시간을 모르면 분석이 불가능한가요?
  4. 구독을 취소하면 환불이 되나요?
  5. 과거 검사 내역을 확인할 수 있나요?
  6. Gemini Flash와 Pro 모델의 차이는 무엇인가요?

### 3.3 Reusable Components from `/src/components/ui/`

- `Button` (shadcn/ui) - CTA buttons
- `Card` (shadcn/ui) - Feature cards, pricing cards
- `Accordion` (shadcn/ui) - FAQ section

## 4. API Integration

### 4.1 Data Sources

- **No API calls required**
- Static content only
- Constants from `/src/constants/app.ts`:
  - `SUBSCRIPTION.FREE_ANALYSES_COUNT`
  - `SUBSCRIPTION.PRO_ANALYSES_COUNT`
  - `SUBSCRIPTION.PRO_PRICE`

### 4.2 Functions from `/src/lib/`

- None required (static page)

### 4.3 Error Handling Strategy

- No error handling needed (static content)
- Fallback: If constants unavailable, hardcode values

## 5. Data Flow

### 5.1 Server → Client

```
1. User accesses "/"
2. Server Component renders static content
3. Client Components hydrate for interactivity (CTA, FAQ accordion)
4. No data fetching
```

### 5.2 Navigation Flow

- **CTA "무료로 시작하기"** → `/sign-up` (Clerk signup)
- **"이미 계정이 있으신가요?"** → `/sign-in` (Clerk login)
- **"Pro 시작하기"** → `/sign-up` (same as free, redirect to upgrade after login)

## 6. Validation

### 6.1 Client-side Validation

- None required (no forms)

### 6.2 Server-side Validation

- None required (no user input)

### 6.3 Error Message Display

- None required

## 7. UI Components

### 7.1 shadcn/ui Components

- `Button` - CTA buttons
- `Card` - Feature cards, pricing cards
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` - FAQ

### 7.2 Layout Structure

```
<main className="flex flex-col">
  <HeroSection className="min-h-screen flex items-center justify-center" />
  <FeaturesSection className="py-16 bg-gray-50" />
  <PricingSection className="py-16" />
  <FAQSection className="py-16 bg-gray-50" />
</main>
```

### 7.3 Responsive Design

- **Mobile** (< 640px):
  - Single column layout
  - Stacked pricing cards
  - Full-width buttons
- **Tablet** (640px - 1024px):
  - 2 columns for features
  - Side-by-side pricing cards
- **Desktop** (> 1024px):
  - 4 columns for features
  - Max-width container (1280px)

### 7.4 Styling Approach

- Tailwind CSS
- shadcn/ui components for consistency
- Hero section: Gradient background
- Sections: Alternating white/gray backgrounds

## 8. Implementation Checklist

- [ ] Create `src/app/page.tsx` (Server Component)
- [ ] Create `src/app/components/HeroSection.tsx` (Client Component)
- [ ] Create `src/app/components/FeaturesSection.tsx` (Server Component)
- [ ] Create `src/app/components/PricingSection.tsx` (Server Component)
- [ ] Create `src/app/components/FAQSection.tsx` (Client Component)
- [ ] Import constants from `/src/constants/app.ts`
- [ ] Install shadcn/ui components: `Button`, `Card`, `Accordion`
- [ ] Add responsive design (mobile, tablet, desktop)
- [ ] Add smooth scroll to sections (anchor links)
- [ ] Test CTA button navigation to `/sign-up`
- [ ] Test responsive layout on different screen sizes
- [ ] Verify SEO metadata (title, description, Open Graph)
- [ ] Add accessibility (ARIA labels, keyboard navigation)

## 9. SEO & Performance

### 9.1 Metadata

```tsx
// src/app/page.tsx
export const metadata = {
  title: '사주 분석 서비스 | AI 기반 사주팔자 분석',
  description: 'Google Gemini AI를 활용한 전문적이고 상세한 사주 분석 서비스. 무료 체험 3회 제공.',
  openGraph: {
    title: '사주 분석 서비스',
    description: 'AI가 분석하는 나의 사주',
    type: 'website',
  },
};
```

### 9.2 Performance Optimizations

- Use Server Components for static content
- Minimize Client Components (only HeroSection and FAQSection need interactivity)
- Static generation (SSG) - no data fetching
- Lazy load images (if any)

## 10. Accessibility

- Semantic HTML (h1, h2, section, nav)
- ARIA labels for buttons
- Keyboard navigation for accordion
- Color contrast ratio > 4.5:1
- Alt text for images (if any)

## 11. Testing Scenarios

### 11.1 Visual Tests

- [ ] Hero section displays correctly
- [ ] Features section shows 4 cards
- [ ] Pricing table displays Free vs Pro
- [ ] FAQ accordion expands/collapses
- [ ] Responsive layout works on mobile/tablet/desktop

### 11.2 Navigation Tests

- [ ] "무료로 시작하기" → `/sign-up`
- [ ] "로그인" → `/sign-in`
- [ ] Smooth scroll to sections (if anchor links added)

### 11.3 Accessibility Tests

- [ ] Screen reader compatibility
- [ ] Keyboard navigation (Tab, Enter for accordion)
- [ ] Color contrast meets WCAG AA

## 12. Edge Cases

- **JavaScript disabled**: Server Components still render, only FAQ accordion won't work
- **Slow network**: Static page loads fast, no API dependencies
- **Old browsers**: Ensure polyfills for modern CSS (grid, flexbox)

## 13. Dependencies

### 13.1 External Libraries

- None (shadcn/ui components only)

### 13.2 Internal Dependencies

- `/src/constants/app.ts` - SUBSCRIPTION constants
- `/src/components/ui/` - shadcn/ui components

## 14. Future Enhancements (Out of Scope)

- Blog section
- Testimonials section
- Video demo
- Chatbot widget
- Multi-language support (i18n)

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx and components
