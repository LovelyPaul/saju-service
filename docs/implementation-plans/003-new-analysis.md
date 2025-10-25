# Implementation Plan: New Analysis Page

## 1. Overview

- **Purpose**: Allow users to input birth information and request AI-based Saju analysis
- **Route**: `/analysis/new`
- **Auth**: Required
- **Related Usecases**: UC-003 (새 사주 분석하기)

## 2. File Structure

```
src/app/analysis/new/
├── page.tsx                    # Server Component (wrapper)
├── components/
│   ├── AnalysisForm.tsx       # Client Component (main form)
│   ├── BirthDatePicker.tsx    # Client Component
│   ├── BirthTimePicker.tsx    # Client Component
│   ├── GenderSelector.tsx     # Client Component
│   └── AnalysisLoading.tsx    # Client Component (loading UI)
└── actions.ts                  # Server Actions (create analysis)
```

## 3. Components Breakdown

### 3.1 Server Components

**page.tsx** (Main Page Wrapper)
- **Type**: Server Component
- **Purpose**: Check user subscription before rendering form
- **Data Fetching**:
  ```tsx
  import { auth } from '@clerk/nextjs/server';
  import { getUserByClerkId } from '@/lib/supabase/queries';

  const { userId } = await auth();
  const user = await getUserByClerkId(supabase, userId);

  if (user.analyses_remaining <= 0) {
    return <NoAnalysesRemaining tier={user.subscription_tier} />;
  }
  ```
- **Structure**:
  ```tsx
  <main>
    <h1>새 사주 분석</h1>
    <AnalysisForm user={user} />
  </main>
  ```

### 3.2 Client Components

**AnalysisForm.tsx** (Main Form)
- **Type**: Client Component
- **Purpose**: Manage form state and submission
- **Props**:
  ```tsx
  interface AnalysisFormProps {
    user: User;
  }
  ```
- **State**:
  ```tsx
  const [formData, setFormData] = useState<CreateAnalysisInput>({
    name: '',
    birth_date: '',
    birth_time: undefined,
    is_lunar: false,
    gender: 'male',
    additional_info: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  ```
- **Validation**: Use Zod schema from `/src/schemas/analysis.ts`
  ```tsx
  import { createAnalysisSchema } from '@/schemas/analysis';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const result = createAnalysisSchema.safeParse(formData);
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setIsLoading(true);
    const analysisId = await createAnalysis(formData);
    router.push(`/analysis/${analysisId}`);
  };
  ```
- **Form Fields**:
  - Name (text input)
  - Birth date (date picker)
  - Lunar/Solar (radio buttons)
  - Birth time (time picker or "Unknown" checkbox)
  - Gender (radio buttons)
  - Additional info (textarea)
  - Submit button

**BirthDatePicker.tsx**
- **Type**: Client Component
- **Purpose**: Date picker with validation
- **Props**:
  ```tsx
  interface BirthDatePickerProps {
    value: string;
    onChange: (date: string) => void;
    error?: string;
  }
  ```
- **Validation**:
  - Past date only
  - Within 150 years
  - Format: YYYY-MM-DD

**BirthTimePicker.tsx**
- **Type**: Client Component
- **Purpose**: Time picker with "Unknown" option
- **Props**:
  ```tsx
  interface BirthTimePickerProps {
    value?: string;
    onChange: (time?: string) => void;
    isUnknown: boolean;
    onToggleUnknown: (unknown: boolean) => void;
    error?: string;
  }
  ```
- **Functionality**:
  - Time input (HH:MM)
  - "모름" checkbox → disables time input, sets value to undefined
  - Format: 24-hour

**GenderSelector.tsx**
- **Type**: Client Component
- **Purpose**: Gender radio buttons
- **Props**:
  ```tsx
  interface GenderSelectorProps {
    value: 'male' | 'female';
    onChange: (gender: 'male' | 'female') => void;
  }
  ```
- **UI**: Radio buttons with icons (Male/Female)

**AnalysisLoading.tsx**
- **Type**: Client Component
- **Purpose**: Loading UI during AI analysis
- **Props**: None
- **Display**:
  - Message: "AI가 분석 중입니다..."
  - Spinner animation
  - Estimated time: "약 30초 소요됩니다"
  - Note: "분석이 완료될 때까지 페이지를 벗어나지 마세요"

### 3.3 Reusable Components from `/src/components/`

- `/src/components/ui/input.tsx` - Text inputs
- `/src/components/ui/button.tsx` - Submit button
- `/src/components/ui/label.tsx` - Form labels
- `/src/components/ui/radio-group.tsx` - Gender, Lunar/Solar
- `/src/components/ui/textarea.tsx` - Additional info
- `/src/components/ui/checkbox.tsx` - "모름" checkbox
- `/src/components/common/Loading.tsx` - Loading spinner (in AnalysisLoading)

## 4. API Integration

### 4.1 Server Actions (actions.ts)

```tsx
'use server';

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { generateSajuAnalysis } from '@/lib/gemini/client';
import { createAnalysisSchema } from '@/schemas/analysis';

export async function createAnalysis(input: CreateAnalysisInput) {
  // 1. Authenticate user
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // 2. Validate input
  const validated = createAnalysisSchema.parse(input);

  const supabase = createClient();

  // 3. Get user subscription info
  const user = await getUserByClerkId(supabase, userId);

  // 4. Check remaining analyses
  if (user.analyses_remaining <= 0) {
    throw new Error('ANALYSES_LIMIT_REACHED');
  }

  // 5. Check Pro subscription validity
  if (user.subscription_tier === 'pro' &&
      new Date(user.subscription_ends_at) < new Date()) {
    throw new Error('SUBSCRIPTION_EXPIRED');
  }

  // 6. Select Gemini model
  const model = user.subscription_tier === 'free'
    ? 'gemini-2.5-flash'
    : 'gemini-2.5-pro';

  // 7. Call Gemini API
  try {
    const analysisResult = await generateSajuAnalysis({
      ...validated,
      model,
    });

    // 8. Database transaction
    const { data: analysis, error } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        name: validated.name,
        birth_date: validated.birth_date,
        birth_time: validated.birth_time,
        is_lunar: validated.is_lunar,
        gender: validated.gender,
        additional_info: validated.additional_info,
        analysis_result: analysisResult,
        model_used: model === 'gemini-2.5-flash' ? 'flash' : 'pro',
      })
      .select()
      .single();

    if (error) throw error;

    // 9. Decrement analyses_remaining
    await supabase
      .from('users')
      .update({ analyses_remaining: user.analyses_remaining - 1 })
      .eq('id', user.id);

    return analysis.id;

  } catch (error) {
    // Rollback handled by Supabase (no transaction started)
    throw error;
  }
}
```

### 4.2 Functions from `/src/lib/`

**Gemini API** (`/src/lib/gemini/client.ts`):
```tsx
import { generateSajuAnalysis } from '@/lib/gemini/client';

const result = await generateSajuAnalysis({
  name: input.name,
  birthDate: input.birth_date,
  birthTime: input.birth_time,
  isLunar: input.is_lunar,
  gender: input.gender,
  additionalInfo: input.additional_info,
  model: 'gemini-2.5-flash', // or 'gemini-2.5-pro'
});
```

**Supabase Queries** (`/src/lib/supabase/queries.ts`):
- `getUserByClerkId(supabase, clerkUserId)` → User

### 4.3 Error Handling Strategy

**Client-side**:
```tsx
try {
  const analysisId = await createAnalysis(formData);
  router.push(`/analysis/${analysisId}`);
} catch (error) {
  setIsLoading(false);

  if (error.message === 'ANALYSES_LIMIT_REACHED') {
    // Show upgrade modal
    setShowUpgradeModal(true);
  } else if (error.message === 'SUBSCRIPTION_EXPIRED') {
    toast.error('Pro 구독이 만료되었습니다. 구독을 갱신해주세요.');
  } else {
    toast.error('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}
```

**Server-side**:
- Gemini API timeout (60s): Catch timeout, don't decrement analyses_remaining
- Gemini API error: Catch error, don't decrement analyses_remaining
- Database error: Return error, no partial state

## 5. Data Flow

### 5.1 Page Load Flow

```
1. User navigates to /analysis/new
2. Middleware checks auth
3. page.tsx (Server Component):
   a. Fetch user from Supabase
   b. Check analyses_remaining
   c. If 0: Show NoAnalysesRemaining component
   d. Else: Render AnalysisForm
4. AnalysisForm hydrates
```

### 5.2 Form Submission Flow

```
1. User fills form and clicks "분석 시작"
2. Client-side validation (Zod schema)
3. If invalid: Display inline errors
4. If valid:
   a. Set isLoading = true
   b. Show AnalysisLoading component
   c. Call Server Action: createAnalysis(formData)
5. Server Action:
   a. Authenticate user
   b. Validate input
   c. Check subscription & remaining analyses
   d. Select Gemini model (Flash/Pro)
   e. Call Gemini API (with 60s timeout)
   f. Save analysis to database
   g. Decrement analyses_remaining
   h. Return analysis ID
6. Client:
   a. Receive analysis ID
   b. Redirect to /analysis/[id]
```

### 5.3 Error Flow

```
1. Error occurs (Gemini timeout, DB error, etc.)
2. Server Action throws error
3. Client catches error
4. Set isLoading = false
5. Display error message (toast or inline)
6. Keep form data (don't reset)
7. Show retry button
```

## 6. Validation

### 6.1 Client-side Validation

Use schema from `/src/schemas/analysis.ts`:
```tsx
import { createAnalysisSchema } from '@/schemas/analysis';

const result = createAnalysisSchema.safeParse(formData);
```

**Validation Rules**:
- Name: 2-50 characters, required
- Birth date: YYYY-MM-DD format, past date, within 150 years, required
- Birth time: HH:MM format, optional (can be undefined if "모름")
- Is lunar: boolean, required
- Gender: 'male' or 'female', required
- Additional info: max 500 characters, optional

### 6.2 Server-side Validation

Same schema, but with `.parse()` (throws on error):
```tsx
const validated = createAnalysisSchema.parse(input);
```

### 6.3 Error Message Display

**Inline errors** (below each field):
- Name: "이름은 2자 이상 50자 이하로 입력해주세요"
- Birth date: "생년월일을 선택해주세요"
- Gender: "성별을 선택해주세요"

**Toast errors** (global):
- "분석 횟수를 모두 사용했습니다. Pro 요금제로 업그레이드하시겠습니까?"
- "분석 중 오류가 발생했습니다. 다시 시도해주세요."
- "Pro 구독이 만료되었습니다. 구독을 갱신해주세요."

## 7. UI Components

### 7.1 shadcn/ui Components

- `Input` - Text inputs (name)
- `Button` - Submit button
- `Label` - Form labels
- `RadioGroup`, `RadioGroupItem` - Gender, Lunar/Solar
- `Textarea` - Additional info
- `Checkbox` - "모름" checkbox
- `Calendar` (optional) - Date picker
- `Toast` - Error notifications

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4 max-w-2xl">
  <h1>새 사주 분석</h1>

  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Name */}
    <div>
      <Label htmlFor="name">이름 *</Label>
      <Input id="name" value={formData.name} onChange={...} />
      {errors.name && <p className="text-red-500">{errors.name}</p>}
    </div>

    {/* Birth Date */}
    <BirthDatePicker value={formData.birth_date} onChange={...} error={errors.birth_date} />

    {/* Lunar/Solar */}
    <RadioGroup value={formData.is_lunar ? 'lunar' : 'solar'} onValueChange={...}>
      <RadioGroupItem value="solar" label="양력" />
      <RadioGroupItem value="lunar" label="음력" />
    </RadioGroup>

    {/* Birth Time */}
    <BirthTimePicker
      value={formData.birth_time}
      onChange={...}
      isUnknown={!formData.birth_time}
      onToggleUnknown={...}
    />

    {/* Gender */}
    <GenderSelector value={formData.gender} onChange={...} />

    {/* Additional Info */}
    <div>
      <Label htmlFor="additional">추가 요청사항 (선택)</Label>
      <Textarea id="additional" value={formData.additional_info} onChange={...} />
    </div>

    {/* Submit */}
    <Button type="submit" disabled={isLoading} className="w-full">
      {isLoading ? <Spinner /> : '분석 시작'}
    </Button>
  </form>
</main>
```

### 7.3 Responsive Design

- **Mobile**: Single column, full-width inputs
- **Tablet/Desktop**: Max-width 600px, centered

### 7.4 Loading State

When `isLoading`:
- Replace form with AnalysisLoading component
- Show spinner + message
- Disable back navigation (warn user before leaving)

## 8. Implementation Checklist

- [ ] Create `src/app/analysis/new/page.tsx` (Server Component)
- [ ] Create `src/app/analysis/new/components/AnalysisForm.tsx`
- [ ] Create `src/app/analysis/new/components/BirthDatePicker.tsx`
- [ ] Create `src/app/analysis/new/components/BirthTimePicker.tsx`
- [ ] Create `src/app/analysis/new/components/GenderSelector.tsx`
- [ ] Create `src/app/analysis/new/components/AnalysisLoading.tsx`
- [ ] Create `src/app/analysis/new/actions.ts` (Server Action)
- [ ] Implement client-side validation with Zod
- [ ] Implement server-side validation with Zod
- [ ] Add error handling (Gemini timeout, DB errors)
- [ ] Add loading state (AnalysisLoading)
- [ ] Prevent duplicate submissions (disable button)
- [ ] Test form validation (all fields)
- [ ] Test Gemini API integration
- [ ] Test analyses_remaining decrement
- [ ] Test error scenarios (timeout, limit reached)
- [ ] Add accessibility (labels, ARIA)

## 9. Performance Optimizations

- Use Server Components for static parts (page wrapper)
- Use Client Components for form (interactivity required)
- Debounce validation (optional, for real-time validation)
- Optimistic UI: Disable button immediately on submit

## 10. Accessibility

- Labels for all inputs (`<Label htmlFor="...">`)
- Required field indicators (*)
- Error messages associated with inputs (aria-describedby)
- Keyboard navigation (Tab through fields, Enter to submit)
- Focus management (auto-focus name field)
- Screen reader announcements for errors

## 11. Testing Scenarios

### 11.1 Validation Tests

- [ ] Empty name: Show error
- [ ] Name < 2 chars: Show error
- [ ] Name > 50 chars: Show error
- [ ] No birth date: Show error
- [ ] Future birth date: Show error
- [ ] No gender: Show error
- [ ] Birth time "모름": Allow submission (birth_time = undefined)
- [ ] Additional info > 500 chars: Show error

### 11.2 Submission Tests

- [ ] Valid form (Free Tier): Create analysis with Flash model
- [ ] Valid form (Pro Tier): Create analysis with Pro model
- [ ] Analyses remaining = 0 (Free): Show upgrade modal
- [ ] Analyses remaining = 0 (Pro): Show "다음 달에 이용" message
- [ ] Pro subscription expired: Show "구독 갱신" message
- [ ] Gemini API timeout: Show error, don't decrement analyses
- [ ] Database error: Show error, don't decrement analyses

### 11.3 Edge Cases

- [ ] Duplicate submission: Button disabled during loading
- [ ] Network error: Show error, allow retry
- [ ] Leave page during loading: Warn user
- [ ] Very long name (50 chars): Allowed
- [ ] Special characters in name: Allowed (safe SQL)

## 12. Edge Cases

- **Gemini API timeout (60s)**: Show error, don't decrement analyses_remaining
- **Concurrent analysis creation**: Database constraint prevents duplicate at same time
- **Subscription expires during submission**: Check again in Server Action
- **User leaves page during loading**: Warn with beforeunload event
- **Birth time "모름" + time entered**: Prefer "모름" state

## 13. Dependencies

### 13.1 External Libraries

- `@clerk/nextjs` - Authentication
- `zod` - Validation
- `react-hook-form` (optional) - Form management
- `lucide-react` - Icons
- `sonner` (optional) - Toast notifications

### 13.2 Internal Dependencies

- `/src/lib/gemini/client.ts` - generateSajuAnalysis
- `/src/lib/supabase/queries.ts` - getUserByClerkId
- `/src/schemas/analysis.ts` - createAnalysisSchema
- `/src/types/analysis.ts` - CreateAnalysisInput, Gender
- `/src/types/user.ts` - User
- `/src/constants/app.ts` - API_TIMEOUT.GEMINI
- `/src/components/ui/` - shadcn/ui components

## 14. Future Enhancements (Out of Scope)

- Auto-save draft (localStorage)
- Time zone auto-detection
- Location-based time zone
- Multiple people analysis (batch)
- Upload birth certificate image (OCR)
- Share analysis with family/friends

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx, form, and Server Action
