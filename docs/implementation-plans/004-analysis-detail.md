# Implementation Plan: Analysis Detail Page

## 1. Overview

- **Purpose**: Display detailed Saju analysis results for a specific analysis
- **Route**: `/analysis/[id]`
- **Auth**: Required (user must own the analysis)
- **Related Usecases**: UC-004 (분석 상세보기)

## 2. File Structure

```
src/app/analysis/[id]/
├── page.tsx                    # Server Component (main page)
├── components/
│   ├── AnalysisHeader.tsx     # Server Component (metadata)
│   ├── AnalysisContent.tsx    # Client Component (markdown render)
│   └── AnalysisActions.tsx    # Client Component (share, print, etc.)
└── not-found.tsx               # 404 page (analysis not found)
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Analysis Detail Page)
- **Type**: Server Component
- **Purpose**: Fetch analysis data and verify ownership
- **Data Fetching**:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getAnalysisById } from '@/lib/supabase/queries';

  const { userId } = await auth();
  const user = await getUserByClerkId(supabase, userId);
  const analysis = await getAnalysisById(supabase, params.id, user.id);

  if (!analysis) {
    notFound(); // 404 page
  }

  // Check ownership
  if (analysis.user_id !== user.id) {
    redirect('/dashboard'); // or show 403 error
  }
  ```
- **Structure**:
  ```tsx
  <main>
    <AnalysisHeader analysis={analysis} />
    <AnalysisContent content={analysis.analysis_result} />
    <AnalysisActions analysisId={analysis.id} />
  </main>
  ```

**AnalysisHeader.tsx**
- **Type**: Server Component
- **Purpose**: Display analysis metadata
- **Props**:
  ```tsx
  interface AnalysisHeaderProps {
    analysis: Analysis;
  }
  ```
- **Display**:
  - Name
  - Gender + icon
  - Birth date (formatted, 음력/양력 표시)
  - Birth time (if available, else "출생시간 미상")
  - Created date (relative time)
  - Model badge (Flash/Pro)
- **Layout**:
  ```tsx
  <header className="border-b pb-4 mb-6">
    <h1>{analysis.name}님의 사주 분석</h1>
    <div className="flex gap-4 text-sm text-gray-600">
      <span>{gender === 'male' ? '남성' : '여성'}</span>
      <span>{formatDate(birth_date)} ({is_lunar ? '음력' : '양력'})</span>
      {birth_time && <span>{birth_time}</span>}
      <Badge>{model_used === 'flash' ? 'Flash' : 'Pro'}</Badge>
    </div>
    <p className="text-sm text-gray-500">{formatRelativeTime(created_at)} 분석</p>
  </header>
  ```

### 3.2 Client Components

**AnalysisContent.tsx**
- **Type**: Client Component
- **Purpose**: Render Markdown analysis result
- **Props**:
  ```tsx
  interface AnalysisContentProps {
    content: string; // Markdown string
  }
  ```
- **Markdown Rendering**:
  ```tsx
  import ReactMarkdown from 'react-markdown';
  import remarkGfm from 'remark-gfm';

  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    className="prose prose-lg max-w-none"
  >
    {content}
  </ReactMarkdown>
  ```
- **Styling**:
  - Use Tailwind Typography (`prose` classes)
  - Headings: h1, h2, h3 styled appropriately
  - Lists: Bullets and numbers
  - Emphasis: Bold, italic

**AnalysisActions.tsx**
- **Type**: Client Component
- **Purpose**: Action buttons (print, share, back to dashboard, new analysis)
- **Props**:
  ```tsx
  interface AnalysisActionsProps {
    analysisId: string;
  }
  ```
- **Actions**:
  - **"대시보드로 돌아가기"**: `router.push('/dashboard')`
  - **"새 분석하기"**: `router.push('/analysis/new')`
  - **"인쇄하기"** (optional): `window.print()`
  - **"공유하기"** (future): Copy link
- **Layout**:
  ```tsx
  <div className="flex gap-4 mt-8">
    <Button onClick={() => router.push('/dashboard')}>
      대시보드로 돌아가기
    </Button>
    <Button onClick={() => router.push('/analysis/new')}>
      새 분석하기
    </Button>
    <Button variant="outline" onClick={() => window.print()}>
      인쇄하기
    </Button>
  </div>
  ```

### 3.3 Reusable Components from `/src/components/`

- `/src/components/ui/badge.tsx` - Model badge
- `/src/components/ui/button.tsx` - Action buttons
- `/src/components/common/ErrorMessage.tsx` - Error display (if fetch fails)

### 3.4 404 Page

**not-found.tsx**
- **Type**: Server Component
- **Purpose**: Show when analysis not found
- **Display**:
  - Message: "분석 결과를 찾을 수 없습니다"
  - Button: "대시보드로 돌아가기" → `/dashboard`

## 4. API Integration

### 4.1 Data Sources

**Server-side (page.tsx)**:
```tsx
import { createClient } from '@/lib/supabase/server';
import { getAnalysisById } from '@/lib/supabase/queries';

const supabase = createClient();
const analysis = await getAnalysisById(supabase, params.id, userId);
```

### 4.2 Functions from `/src/lib/supabase/queries.ts`

```tsx
export async function getAnalysisById(
  supabase: SupabaseClient,
  analysisId: string,
  userId: string
): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single();

  if (error) return null;
  return data;
}
```

### 4.3 Error Handling Strategy

**Analysis Not Found**:
```tsx
if (!analysis) {
  notFound(); // Render not-found.tsx
}
```

**Ownership Verification**:
```tsx
if (analysis.user_id !== user.id) {
  redirect('/dashboard'); // or return 403 error page
}
```

**Database Error**:
```tsx
try {
  const analysis = await getAnalysisById(supabase, params.id, user.id);
} catch (error) {
  return <ErrorMessage message="분석 결과를 불러올 수 없습니다." />;
}
```

## 5. Data Flow

### 5.1 Server → Client

```
1. User accesses /analysis/[id] (from dashboard or after new analysis)
2. Middleware checks auth
3. page.tsx (Server Component):
   a. Extract analysisId from params
   b. Fetch user from Clerk
   c. Fetch analysis from Supabase (with ownership check)
   d. If not found: notFound()
   e. If not owned: redirect('/dashboard')
4. Render AnalysisHeader (server)
5. Render AnalysisContent (client, with markdown string)
6. Render AnalysisActions (client)
7. Client hydrates action buttons
```

### 5.2 Navigation Flow

- **"대시보드로 돌아가기"** → `/dashboard`
- **"새 분석하기"** → `/analysis/new`
- **"인쇄하기"** → `window.print()`

## 6. Validation

### 6.1 Client-side Validation

- None required (read-only page)

### 6.2 Server-side Validation

- **Analysis ID**: UUID format (validated by Supabase)
- **Ownership**: `analysis.user_id === user.id`

### 6.3 Error Message Display

- **404**: "분석 결과를 찾을 수 없습니다"
- **403**: Redirect to dashboard (no error shown)
- **Database error**: "분석 결과를 불러올 수 없습니다. 잠시 후 다시 시도해주세요."

## 7. UI Components

### 7.1 shadcn/ui Components

- `Badge` - Model type (Flash/Pro)
- `Button` - Action buttons

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4 max-w-4xl">
  <AnalysisHeader analysis={analysis} />

  <AnalysisContent content={analysis.analysis_result} />

  <AnalysisActions analysisId={analysis.id} />
</main>
```

### 7.3 Responsive Design

- **Mobile**: Single column, full-width
- **Tablet/Desktop**: Max-width 1024px, centered
- **Print**: Optimized layout (hide buttons, clean typography)

### 7.4 Markdown Styling

Use Tailwind Typography plugin:
```tsx
<div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

**Customizations**:
- H1: Large, bold
- H2: Medium, bold, border-bottom
- H3: Small, semi-bold
- Lists: Proper indentation
- Links: Blue, underlined (if any)
- Blockquotes: Left border, italic

## 8. Implementation Checklist

- [ ] Create `src/app/analysis/[id]/page.tsx` (Server Component)
- [ ] Create `src/app/analysis/[id]/not-found.tsx`
- [ ] Create `src/app/analysis/[id]/components/AnalysisHeader.tsx`
- [ ] Create `src/app/analysis/[id]/components/AnalysisContent.tsx`
- [ ] Create `src/app/analysis/[id]/components/AnalysisActions.tsx`
- [ ] Install `react-markdown` and `remark-gfm`
- [ ] Add `getAnalysisById` to `/src/lib/supabase/queries.ts`
- [ ] Add ownership verification
- [ ] Test 404 page (invalid ID)
- [ ] Test 403 (access other user's analysis)
- [ ] Test markdown rendering (all sections)
- [ ] Test print functionality
- [ ] Add print CSS (@media print)
- [ ] Test responsive layout
- [ ] Verify accessibility (headings, focus)

## 9. Markdown Rendering

### 9.1 Install Dependencies

```bash
npm install react-markdown remark-gfm
```

### 9.2 Configuration

```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // GitHub Flavored Markdown (tables, etc.)

<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  className="prose prose-lg max-w-none"
>
  {content}
</ReactMarkdown>
```

### 9.3 Expected Markdown Structure

From PRD, analysis result includes:
1. **🌸 나의 원명(原命) 이해하기: 사주팔자(四柱八字)와 오행(五行) 분석**
   - 천간(天干)과 지지(地支) 구성
   - 오행(五行)의 균형
   - 일간(日干) 분석
   - 십신(十神) 분석

2. **🌟 삶의 흐름 읽기: 대운(大運)과 세운(歲運) 해석**
   - 현재 대운(大運) 분석
   - 가까운 미래의 세운(歲運) 예측 (향후 3년)
   - 조언

3. **🌱 나의 잠재력 발휘하기: 종합 운세 분석 및 맞춤 솔루션**
   - 성격 및 적성 분석
   - 재물운(財物運) 분석
   - 직업/학업운(職業/學業運) 분석
   - 연애/결혼운(戀愛/結婚運) 분석
   - 건강운(健康運) 분석
   - 종합 조언 및 개운법(開運法)

## 10. Performance Optimizations

- Use Server Component for page (static after generation)
- Use Client Component only for markdown rendering (interactivity for links)
- Cache analysis data (React Server Components cache)
- Static rendering for print layout

## 11. Accessibility

- Semantic HTML (article, section, h1-h3)
- Proper heading hierarchy
- Alt text for icons (if any)
- Keyboard navigation for buttons
- Print-friendly layout
- Screen reader friendly markdown content

## 12. Testing Scenarios

### 12.1 Data Tests

- [ ] Valid analysis ID: Display full content
- [ ] Invalid analysis ID: Show 404 page
- [ ] Other user's analysis: Redirect to dashboard
- [ ] Markdown rendering: All sections display correctly
- [ ] Long analysis (> 5000 chars): Scrollable, no truncation

### 12.2 Auth Tests

- [ ] Unauthenticated user: Redirect to /sign-in
- [ ] Authenticated user (owner): Display analysis
- [ ] Authenticated user (non-owner): Redirect to dashboard

### 12.3 Navigation Tests

- [ ] Click "대시보드로 돌아가기" → /dashboard
- [ ] Click "새 분석하기" → /analysis/new
- [ ] Click "인쇄하기" → Print dialog opens

### 12.4 Print Tests

- [ ] Print layout: Hide buttons, clean typography
- [ ] Page breaks: Sections don't break mid-paragraph
- [ ] Header: Analysis metadata visible

## 13. Edge Cases

- **Very long analysis (> 10,000 chars)**: No truncation, full display
- **Analysis with special characters**: Properly rendered (no escaping issues)
- **Markdown rendering errors**: Fallback to plain text
- **Empty analysis_result**: Show "분석 결과가 비어있습니다" (shouldn't happen)
- **Invalid UUID in URL**: Show 404 page
- **Concurrent access (same user, multiple tabs)**: No issues (read-only)

## 14. Dependencies

### 14.1 External Libraries

- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `@clerk/nextjs` - Authentication
- `lucide-react` - Icons

### 14.2 Internal Dependencies

- `/src/lib/supabase/queries.ts` - getAnalysisById
- `/src/types/analysis.ts` - Analysis type
- `/src/utils/date.ts` - formatDate, formatRelativeTime
- `/src/components/ui/badge.tsx`
- `/src/components/ui/button.tsx`

## 15. Print Styling

### 15.1 Print CSS

```css
/* globals.css */
@media print {
  /* Hide buttons */
  button, [role="button"] {
    display: none;
  }

  /* Clean layout */
  body {
    background: white;
    color: black;
  }

  /* Page breaks */
  h1, h2 {
    page-break-after: avoid;
  }

  /* Margins */
  @page {
    margin: 2cm;
  }
}
```

### 15.2 Print Header

Add analysis metadata at the top for print:
```tsx
<div className="print:block hidden">
  <h1>{analysis.name}님의 사주 분석</h1>
  <p>생년월일: {formatDate(analysis.birth_date)}</p>
  <p>분석일: {formatDate(analysis.created_at)}</p>
</div>
```

## 16. Future Enhancements (Out of Scope)

- Download as PDF
- Share link (with temporary token)
- Export as image
- Add notes/comments
- Compare with other analyses
- Bookmark specific sections
- Email analysis to user

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx, components, and markdown rendering
