# Implementation Plans - Saju Analysis Service

## Overview

This directory contains detailed implementation plans for all 9 pages in the Saju analysis service. Each plan provides step-by-step guidance for implementing a specific page using Next.js 14 App Router.

## Document Structure

Each implementation plan follows a consistent structure:

1. **Overview** - Purpose, route, auth requirements, related use cases
2. **File Structure** - Directory layout and file organization
3. **Components Breakdown** - Server/Client components with props
4. **API Integration** - Data sources, functions, error handling
5. **Data Flow** - Server → Client, form submission, navigation
6. **Validation** - Client/Server validation strategies
7. **UI Components** - shadcn/ui components, layout, responsive design
8. **Implementation Checklist** - Step-by-step tasks
9. **Performance Optimizations** - Best practices
10. **Accessibility** - WCAG compliance
11. **Testing Scenarios** - Test cases and edge cases
12. **Dependencies** - External and internal dependencies

## Implementation Plans

### Public Pages

#### 001-home.md
- **Route**: `/`
- **Auth**: Not required
- **Purpose**: Landing page with features, pricing, FAQ
- **Key Components**: HeroSection, FeaturesSection, PricingSection, FAQSection
- **Stack**: Server Components (mostly), static content

### Authenticated Pages

#### 002-dashboard.md
- **Route**: `/dashboard`
- **Auth**: Required
- **Purpose**: Analysis history, subscription status, search
- **Key Components**: AnalysesList, SearchBar, SubscriptionCard
- **Stack**: Server Components + Client Components for interactivity

#### 003-new-analysis.md
- **Route**: `/analysis/new`
- **Auth**: Required
- **Purpose**: Create new Saju analysis with Gemini AI
- **Key Components**: AnalysisForm, BirthDatePicker, BirthTimePicker
- **Stack**: Server Component wrapper + Client Component form
- **API**: Server Action → Gemini API → Supabase

#### 004-analysis-detail.md
- **Route**: `/analysis/[id]`
- **Auth**: Required (ownership verified)
- **Purpose**: Display detailed analysis results
- **Key Components**: AnalysisHeader, AnalysisContent (Markdown)
- **Stack**: Server Component + Client Component for Markdown rendering
- **Dependencies**: react-markdown, remark-gfm

### Subscription & Payment Pages

#### 005-subscription.md
- **Route**: `/subscription`
- **Auth**: Required
- **Purpose**: Manage subscription (view, cancel, resume)
- **Key Components**: CurrentPlan, PaymentHistory, CancelModal
- **Stack**: Server Components + Client Components for actions
- **API**: Server Actions (cancel, resume)

#### 006-subscription-upgrade.md
- **Route**: `/subscription/upgrade`
- **Auth**: Required
- **Purpose**: Upgrade to Pro with Toss Payments
- **Key Components**: UpgradeCard, PaymentWidget
- **Stack**: Server Component wrapper + Client Component for Toss widget
- **API**: POST /api/payments/confirm
- **Dependencies**: @tosspayments/payment-widget-sdk

#### 007-payment-success.md
- **Route**: `/payment/success`
- **Auth**: Required
- **Purpose**: Handle payment success callback
- **Key Components**: SuccessMessage
- **Stack**: Client Component (query params)
- **Flow**: Extract params → Confirm payment → Show success → Redirect

#### 008-payment-fail.md
- **Route**: `/payment/fail`
- **Auth**: Required
- **Purpose**: Handle payment failure callback
- **Key Components**: FailMessage
- **Stack**: Client Component (query params)
- **Flow**: Extract error → Display reason → Retry option

### Account Management

#### 009-account.md
- **Route**: `/account`
- **Auth**: Required
- **Purpose**: Account settings using Clerk's UserProfile
- **Key Components**: Clerk's `<UserProfile />`
- **Stack**: Client Component (Clerk component)
- **Features**: Profile, security, account deletion (all via Clerk)

## Common Dependencies

All pages share these common modules:

### Types (`/src/types/`)
- `user.ts` - User, SubscriptionStatus, SubscriptionTier
- `analysis.ts` - Analysis, CreateAnalysisInput, Gender, ModelType
- `payment.ts` - Payment, BillingKey, TossPaymentConfirmRequest

### Schemas (`/src/schemas/`)
- `analysis.ts` - createAnalysisSchema (Zod)
- `payment.ts` - paymentConfirmSchema (Zod)

### Supabase (`/src/lib/supabase/`)
- `queries.ts` - getUserByClerkId, getUserAnalyses, getAnalysisById, etc.
- `types.ts` - Auto-generated database types

### External APIs (`/src/lib/`)
- `gemini/client.ts` - generateSajuAnalysis
- `gemini/prompts.ts` - generateSajuAnalysisPrompt
- `toss/client.ts` - confirmPayment, payWithBillingKey, deleteBillingKey

### Utilities (`/src/utils/`)
- `date.ts` - formatDate, formatDateTime, formatRelativeTime
- `error.ts` - getErrorMessage, isApiError
- `subscription.ts` - calculateSubscriptionStatus

### UI Components (`/src/components/`)
- `ui/*` - shadcn/ui components (Button, Card, Input, etc.)
- `common/Loading.tsx` - Loading spinner
- `common/ErrorMessage.tsx` - Error display
- `subscription/SubscriptionCard.tsx` - Reusable subscription status card

## Implementation Order

### Phase 1: Core Pages (Week 1)
1. **001-home.md** - Landing page (public)
2. **002-dashboard.md** - Main authenticated page
3. **004-analysis-detail.md** - View results (simple read-only)

### Phase 2: Analysis Creation (Week 2)
4. **003-new-analysis.md** - Complex form + Gemini integration

### Phase 3: Subscription (Week 3)
5. **005-subscription.md** - Subscription management
6. **006-subscription-upgrade.md** - Toss Payments integration
7. **007-payment-success.md** - Success callback
8. **008-payment-fail.md** - Failure callback

### Phase 4: Account (Week 4)
9. **009-account.md** - Clerk UserProfile (simplest)

## Key Technologies

- **Framework**: Next.js 14 (App Router)
- **Auth**: Clerk (`@clerk/nextjs`)
- **Database**: Supabase
- **Payment**: Toss Payments (`@tosspayments/payment-widget-sdk`)
- **AI**: Google Gemini API
- **Validation**: Zod
- **UI**: shadcn/ui + Tailwind CSS
- **Icons**: lucide-react
- **Markdown**: react-markdown + remark-gfm

## Best Practices

### Server vs Client Components
- **Default to Server Components** for better performance
- **Use Client Components only when**:
  - Need interactivity (onClick, onChange)
  - Need browser APIs (localStorage, window)
  - Need React hooks (useState, useEffect)
  - Third-party libraries require client (Toss widget, Clerk components)

### Data Fetching
- Fetch data in Server Components (page.tsx)
- Pass data as props to Client Components
- Use Server Actions for mutations (forms)

### Error Handling
- Client-side: Display user-friendly messages
- Server-side: Log errors, return safe messages
- Use try-catch for all API calls
- Implement retry logic where appropriate

### Validation
- Always validate on both client and server
- Reuse Zod schemas for consistency
- Display inline errors for forms

### Performance
- Minimize Client Components
- Use React Server Components cache
- Implement pagination for large lists
- Debounce search inputs (300ms)

### Security
- Never expose API keys to client
- Validate all user inputs
- Verify ownership before displaying data
- Use HTTPS for all API calls
- Implement rate limiting

## Testing Checklist

For each page:
- [ ] Page loads without errors
- [ ] Auth redirect works (if required)
- [ ] Form validation works (client + server)
- [ ] API calls succeed
- [ ] Error states display correctly
- [ ] Loading states display correctly
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Accessibility (keyboard navigation, screen readers)
- [ ] Edge cases handled
- [ ] Performance optimized

## Troubleshooting

### Common Issues

**Hydration Errors**:
- Ensure Server/Client component split is correct
- Don't use browser APIs in Server Components
- Check for mismatched HTML (timestamps, random IDs)

**Auth Redirects**:
- Verify middleware configuration
- Check Clerk environment variables
- Ensure auth() is called in Server Components

**API Errors**:
- Check environment variables
- Verify API keys are valid
- Check network requests in browser DevTools
- Review server logs

**Toss Payments Issues**:
- Use test keys in development
- Verify success/fail URLs are correct
- Check webhook configuration
- Test with test card numbers

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Toss Payments Docs](https://docs.tosspayments.com)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Gemini API Docs](https://ai.google.dev/docs)

## Contact

For questions or issues:
- Review `/docs/prd.md` for product requirements
- Review `/docs/userflow.md` for user flows
- Review `/docs/common-modules.md` for shared modules
- Review `/docs/usecases/*.md` for detailed use cases

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Total Pages**: 9
**Total File Size**: ~105 KB
