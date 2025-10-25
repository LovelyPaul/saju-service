# Implementation Plan: Dashboard Page

## 1. Overview

- **Purpose**: Display user's analysis history, subscription status, and provide quick access to create new analysis
- **Route**: `/dashboard`
- **Auth**: Required
- **Related Usecases**: UC-002 (Dashboard - 분석 목록 조회)

## 2. File Structure

```
src/app/dashboard/
├── page.tsx                    # Server Component (main page)
├── components/
│   ├── AnalysesList.tsx       # Client Component (list with search)
│   ├── AnalysisCard.tsx       # Client Component (single card)
│   ├── SearchBar.tsx          # Client Component (search input)
│   ├── EmptyState.tsx         # Server Component
│   └── SubscriptionCard.tsx   # Server Component (reuse from common)
└── actions.ts                  # Server Actions (search)
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Dashboard Page)
- **Type**: Server Component
- **Purpose**: Fetch user data and analyses, compose dashboard layout
- **Data Fetching**:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getUserByClerkId, getUserAnalyses } from '@/lib/supabase/queries';

  const { userId } = await auth();
  const user = await getUserByClerkId(supabase, userId);
  const analyses = await getUserAnalyses(supabase, user.id, { limit: 10 });
  ```
- **Props**: None
- **Structure**:
  ```tsx
  <main>
    <SubscriptionCard user={user} />
    {analyses.length === 0 ? (
      <EmptyState />
    ) : (
      <AnalysesList initialAnalyses={analyses} userId={user.id} />
    )}
  </main>
  ```

**SubscriptionCard.tsx** (reuse from `/src/components/subscription/`)
- **Type**: Server Component
- **Purpose**: Display subscription status and remaining analyses
- **Props**:
  ```tsx
  interface SubscriptionCardProps {
    user: User;
  }
  ```
- **Display**:
  - Free Tier: "무료 요금제 | 남은 분석: 2/3회"
  - Pro Active: "Pro 요금제 | 남은 분석: 7/10회 | 만료일: 2025-11-25"
  - Pro Cancelled: "Pro 요금제 (취소 예정) | 종료일: 2025-11-25"
- **CTA**:
  - Free: "Pro 요금제로 업그레이드" → `/subscription/upgrade`
  - Pro Active: "구독 관리" → `/subscription`
  - Pro Cancelled: "구독 재개" → `/subscription`

**EmptyState.tsx**
- **Type**: Server Component
- **Purpose**: Show message when no analyses exist
- **Props**: None
- **Content**:
  - Message: "아직 검사 이력이 없습니다. 첫 검사를 시작해보세요!"
  - Button: "새 검사하기" → `/analysis/new`

### 3.2 Client Components

**AnalysesList.tsx**
- **Type**: Client Component
- **Purpose**: Manage analysis list state and search functionality
- **Props**:
  ```tsx
  interface AnalysesListProps {
    initialAnalyses: Analysis[];
    userId: string;
  }
  ```
- **State**:
  - `analyses` (filtered list)
  - `searchQuery` (search input)
- **Functionality**:
  - Display analyses as cards
  - Handle search with debounce (300ms)
  - Pagination (if > 10 analyses)

**AnalysisCard.tsx**
- **Type**: Client Component
- **Purpose**: Display single analysis summary
- **Props**:
  ```tsx
  interface AnalysisCardProps {
    analysis: Analysis;
  }
  ```
- **Display**:
  - Name
  - Gender icon (male/female)
  - Birth date (formatted)
  - Created date (relative time: "3일 전")
  - Model badge (Flash/Pro)
- **Interaction**: Click → `/analysis/[id]`

**SearchBar.tsx**
- **Type**: Client Component
- **Purpose**: Search input with debounce
- **Props**:
  ```tsx
  interface SearchBarProps {
    onSearch: (query: string) => void;
  }
  ```
- **Functionality**:
  - Debounced input (300ms)
  - Clear button
  - Placeholder: "이름으로 검색..."

### 3.3 Reusable Components from `/src/components/`

- `/src/components/ui/card.tsx` - Card layout
- `/src/components/ui/badge.tsx` - Model badge (Flash/Pro)
- `/src/components/ui/button.tsx` - CTA buttons
- `/src/components/ui/input.tsx` - Search input
- `/src/components/common/Loading.tsx` - Loading state
- `/src/components/common/ErrorMessage.tsx` - Error display

## 4. API Integration

### 4.1 Data Sources

**Server-side (page.tsx)**:
```tsx
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId, getUserAnalyses } from '@/lib/supabase/queries';

const supabase = createClient();
const { userId } = await auth();
const user = await getUserByClerkId(supabase, userId);
const analyses = await getUserAnalyses(supabase, user.id, { limit: 10 });
```

**Client-side (search)**:
```tsx
// actions.ts (Server Action)
'use server';

export async function searchAnalyses(userId: string, query: string) {
  const supabase = createClient();
  const analyses = await getUserAnalyses(supabase, userId, { search: query });
  return analyses;
}
```

### 4.2 Functions from `/src/lib/supabase/queries.ts`

- `getUserByClerkId(supabase, clerkUserId)` → User
- `getUserAnalyses(supabase, userId, options?)` → Analysis[]
  - Options: `{ limit?: number, offset?: number, search?: string }`
- `getSubscriptionStatus(supabase, userId)` → SubscriptionStatus (used in SubscriptionCard)

### 4.3 Error Handling Strategy

**Database Connection Error**:
```tsx
try {
  const analyses = await getUserAnalyses(supabase, user.id);
} catch (error) {
  return (
    <ErrorMessage
      message="데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."
      onRetry={() => router.refresh()}
    />
  );
}
```

**No User Found** (shouldn't happen if auth works):
```tsx
if (!user) {
  redirect('/sign-in');
}
```

## 5. Data Flow

### 5.1 Server → Client

```
1. User accesses /dashboard
2. Middleware checks auth (redirect to /sign-in if not authenticated)
3. page.tsx (Server Component):
   a. Fetch user from Clerk
   b. Fetch user subscription from Supabase
   c. Fetch analyses from Supabase (initial 10)
4. Render SubscriptionCard (server)
5. Render AnalysesList (client, with initialAnalyses)
6. Client hydrates and enables search
```

### 5.2 Search Flow

```
1. User types in SearchBar
2. Debounce 300ms
3. Call Server Action: searchAnalyses(userId, query)
4. Server Action queries Supabase with ILIKE filter
5. Return filtered analyses
6. Update AnalysesList state
7. Re-render AnalysisCard components
```

### 5.3 Navigation Flow

- **AnalysisCard click** → `/analysis/[id]`
- **"새 검사하기"** → `/analysis/new`
- **"Pro 업그레이드"** → `/subscription/upgrade`
- **"구독 관리"** → `/subscription`

## 6. Validation

### 6.1 Client-side Validation

- Search query: No special validation (allow any string)
- Max length: 50 characters

### 6.2 Server-side Validation

- Server Action: Verify userId matches authenticated user
- SQL Injection: Prevented by Supabase Client (parameterized queries)

### 6.3 Error Message Display

- **No search results**: "'{query}'에 대한 검색 결과가 없습니다."
- **Database error**: "데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."

## 7. UI Components

### 7.1 shadcn/ui Components

- `Card`, `CardHeader`, `CardContent` - Layout
- `Badge` - Model type (Flash/Pro)
- `Button` - CTA buttons
- `Input` - Search bar
- `Skeleton` - Loading state (if needed)

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4 max-w-6xl">
  <h1>대시보드</h1>

  <SubscriptionCard user={user} />

  {analyses.length === 0 ? (
    <EmptyState />
  ) : (
    <>
      <SearchBar onSearch={handleSearch} />
      <AnalysesList analyses={analyses} />
    </>
  )}

  <Button asChild className="fixed bottom-4 right-4">
    <Link href="/analysis/new">새 검사하기</Link>
  </Button>
</main>
```

### 7.3 Responsive Design

- **Mobile** (< 640px):
  - Single column layout
  - Stacked cards
  - Fixed "새 검사하기" button (bottom-right)
- **Tablet** (640px - 1024px):
  - 2 columns for analysis cards
- **Desktop** (> 1024px):
  - 3 columns for analysis cards
  - Max-width container (1280px)

### 7.4 Analysis Card Design

```tsx
<Card className="hover:shadow-lg transition-shadow cursor-pointer">
  <CardHeader>
    <div className="flex items-center gap-2">
      {gender === 'male' ? <MaleIcon /> : <FemaleIcon />}
      <h3>{name}</h3>
    </div>
    <Badge>{modelUsed === 'flash' ? 'Flash' : 'Pro'}</Badge>
  </CardHeader>
  <CardContent>
    <p>생년월일: {formatDate(birthDate)}</p>
    <p className="text-sm text-gray-500">{formatRelativeTime(createdAt)}</p>
  </CardContent>
</Card>
```

## 8. Implementation Checklist

- [ ] Create `src/app/dashboard/page.tsx` (Server Component)
- [ ] Create `src/app/dashboard/components/AnalysesList.tsx`
- [ ] Create `src/app/dashboard/components/AnalysisCard.tsx`
- [ ] Create `src/app/dashboard/components/SearchBar.tsx`
- [ ] Create `src/app/dashboard/components/EmptyState.tsx`
- [ ] Reuse `/src/components/subscription/SubscriptionCard.tsx`
- [ ] Create `src/app/dashboard/actions.ts` (Server Actions)
- [ ] Implement search with debounce (300ms)
- [ ] Add pagination (if > 10 analyses)
- [ ] Add loading states (Skeleton or Loading component)
- [ ] Add error handling (database errors)
- [ ] Test search functionality
- [ ] Test navigation to analysis detail
- [ ] Test responsive layout
- [ ] Verify auth middleware redirects unauthenticated users

## 9. Performance Optimizations

- Use Server Components for static parts (SubscriptionCard, EmptyState)
- Use Client Components only for interactive parts (search, list)
- Debounce search to minimize API calls
- Pagination to limit initial data load
- Cache user data (React Server Components cache)

## 10. Accessibility

- Semantic HTML (h1, section, article for cards)
- ARIA labels for search input
- Keyboard navigation (Enter to search, Tab through cards)
- Focus indicators for cards
- Screen reader announcements for search results

## 11. Testing Scenarios

### 11.1 Data Tests

- [ ] No analyses: EmptyState displays
- [ ] 1-10 analyses: All display without pagination
- [ ] > 10 analyses: Pagination appears
- [ ] Search "홍길": Only matching analyses display
- [ ] Search with no results: "검색 결과가 없습니다" message

### 11.2 Auth Tests

- [ ] Unauthenticated user: Redirect to /sign-in
- [ ] Authenticated user: Dashboard displays

### 11.3 Subscription Tests

- [ ] Free Tier: "남은 분석: X/3회", "Pro 업그레이드" button
- [ ] Pro Active: "남은 분석: X/10회", "구독 관리" button
- [ ] Pro Cancelled: "취소 예정", "구독 재개" button

### 11.4 Navigation Tests

- [ ] Click analysis card → /analysis/[id]
- [ ] Click "새 검사하기" → /analysis/new
- [ ] Click "Pro 업그레이드" → /subscription/upgrade

## 12. Edge Cases

- **Database connection failure**: Show error message with retry button
- **Slow query (> 3s)**: Show loading skeleton
- **Very long name**: Truncate with ellipsis
- **No subscription data**: Show default "무료 요금제"
- **Search with special characters**: Handle safely (no SQL injection)

## 13. Dependencies

### 13.1 External Libraries

- `@clerk/nextjs` - Authentication
- `lucide-react` - Icons (Male, Female, Search)
- `date-fns` - Date formatting (from `/src/utils/date.ts`)

### 13.2 Internal Dependencies

- `/src/lib/supabase/queries.ts` - Database queries
- `/src/types/user.ts` - User, SubscriptionStatus types
- `/src/types/analysis.ts` - Analysis type
- `/src/utils/date.ts` - formatDate, formatRelativeTime
- `/src/utils/subscription.ts` - calculateSubscriptionStatus
- `/src/components/ui/` - shadcn/ui components
- `/src/components/common/Loading.tsx`
- `/src/components/common/ErrorMessage.tsx`
- `/src/components/subscription/SubscriptionCard.tsx`

## 14. Future Enhancements (Out of Scope)

- Sorting (by date, name, model)
- Filtering (by model, gender)
- Infinite scroll pagination
- Export analysis results
- Bulk delete analyses
- Analysis comparison view

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx and components
