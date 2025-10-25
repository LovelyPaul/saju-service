# Implementation Plan: Account Management Page

## 1. Overview

- **Purpose**: Allow users to manage their account settings, profile, and security using Clerk's built-in UI
- **Route**: `/account`
- **Auth**: Required
- **Related Usecases**: Account management (uses Clerk's built-in features)

## 2. File Structure

```
src/app/account/
└── page.tsx                    # Client Component (Clerk UserProfile)
```

**Note**: This is a simple page that uses Clerk's `<UserProfile />` component, which provides a complete account management UI out of the box.

## 3. Components Breakdown

### 3.1 Client Components

**page.tsx** (Main Account Page)
- **Type**: Client Component (Clerk component requires client)
- **Purpose**: Render Clerk's built-in UserProfile component
- **Implementation**:
  ```tsx
  'use client';

  import { UserProfile } from '@clerk/nextjs';

  export default function AccountPage() {
    return (
      <div className="flex justify-center p-4">
        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full max-w-4xl',
              card: 'shadow-lg',
            },
          }}
        />
      </div>
    );
  }
  ```

### 3.2 Clerk UserProfile Features

Clerk's `<UserProfile />` component provides:

1. **Profile Section**:
   - Name (first name, last name)
   - Username
   - Email address (verified)
   - Profile photo
   - Update profile information

2. **Security Section**:
   - Password management
   - Two-factor authentication (if enabled)
   - Active sessions
   - Sign out of all devices

3. **Connected Accounts** (if configured):
   - Google account (already connected)
   - Manage OAuth connections

4. **Account Deletion**:
   - Delete account button
   - Confirmation modal

### 3.3 No Custom Components Needed

Clerk handles all UI and functionality, including:
- Form validation
- Error handling
- Success messages
- Loading states

## 4. API Integration

### 4.1 Clerk Webhook Integration

When users update their account via `<UserProfile />`, Clerk triggers webhooks:

**User Updated** (`user.updated`):
- Triggered when: User updates name, email, username
- Webhook handler: `/src/app/api/webhook/clerk/route.ts` (already implemented)
- Action: Update Supabase `users` table

**User Deleted** (`user.deleted`):
- Triggered when: User deletes their account
- Webhook handler: `/src/app/api/webhook/clerk/route.ts` (already implemented)
- Action:
  1. Delete user from Supabase
  2. Delete all analyses
  3. Delete billing keys
  4. Cancel Toss Payments subscription (if Pro)

### 4.2 No Direct API Calls

- All account management handled by Clerk
- Backend syncs via webhooks

## 5. Data Flow

### 5.1 Profile Update Flow

```
1. User accesses /account
2. Clerk renders UserProfile component
3. User updates profile (e.g., name)
4. Clerk processes update
5. Clerk triggers user.updated webhook
6. Backend webhook handler updates Supabase users table
7. Success message shown by Clerk
```

### 5.2 Account Deletion Flow

```
1. User clicks "Delete account" in UserProfile
2. Clerk shows confirmation modal
3. User confirms deletion
4. Clerk deletes account
5. Clerk triggers user.deleted webhook
6. Backend webhook handler:
   a. Check if Pro subscription exists
   b. Cancel Toss Payments subscription
   c. Delete billing keys
   d. Delete all analyses
   e. Delete user from Supabase
7. User logged out and redirected to home page
```

## 6. Validation

### 6.1 Client-side Validation

- Handled by Clerk (email format, password strength, etc.)

### 6.2 Server-side Validation

- Handled by Clerk (email verification, etc.)

### 6.3 Error Message Display

- Handled by Clerk (inline errors, toast notifications)

## 7. UI Components

### 7.1 shadcn/ui Components

- None required (Clerk provides complete UI)

### 7.2 Layout Structure

```tsx
<main className="container mx-auto p-4">
  <UserProfile />
</main>
```

### 7.3 Clerk Appearance Customization

Customize Clerk UI to match app theme:
```tsx
<UserProfile
  appearance={{
    elements: {
      rootBox: 'w-full max-w-4xl',
      card: 'shadow-lg border border-gray-200',
      navbar: 'bg-gray-50',
      navbarButton: 'text-gray-700 hover:bg-gray-100',
      pageScrollBox: 'bg-white',
    },
    variables: {
      colorPrimary: '#your-brand-color',
    },
  }}
/>
```

### 7.4 Responsive Design

- Clerk's UserProfile is responsive by default
- Works on mobile, tablet, desktop

## 8. Implementation Checklist

- [ ] Create `src/app/account/page.tsx`
- [ ] Import `UserProfile` from `@clerk/nextjs`
- [ ] Customize appearance to match app theme
- [ ] Test profile update
- [ ] Test password change
- [ ] Test account deletion
- [ ] Verify webhook integration (user.updated, user.deleted)
- [ ] Test Supabase sync after profile update
- [ ] Test Pro subscription cancellation on account deletion
- [ ] Verify responsive layout

## 9. Webhook Handlers

### 9.1 User Updated Webhook

**File**: `/src/app/api/webhook/clerk/route.ts` (already exists)

```tsx
case 'user.updated':
  await supabase
    .from('users')
    .update({
      email: event.data.email_addresses[0].email_address,
      first_name: event.data.first_name,
      last_name: event.data.last_name,
    })
    .eq('clerk_user_id', event.data.id);
  break;
```

### 9.2 User Deleted Webhook

```tsx
case 'user.deleted':
  const user = await getUserByClerkId(supabase, event.data.id);

  // Cancel Pro subscription if exists
  if (user.subscription_tier === 'pro') {
    const billingKey = await getBillingKey(supabase, user.id);
    if (billingKey) {
      await deleteBillingKey(billingKey.billing_key);
    }
  }

  // Delete all related data
  await supabase.from('analyses').delete().eq('user_id', user.id);
  await supabase.from('payments').delete().eq('user_id', user.id);
  await supabase.from('billing_keys').delete().eq('user_id', user.id);
  await supabase.from('users').delete().eq('id', user.id);
  break;
```

## 10. Performance Optimizations

- Clerk handles all optimizations (lazy loading, code splitting)
- No custom optimization needed

## 11. Accessibility

- Clerk's UserProfile is WCAG AA compliant
- Includes:
  - Semantic HTML
  - ARIA labels
  - Keyboard navigation
  - Screen reader support

## 12. Testing Scenarios

### 12.1 Profile Tests

- [ ] Update first name: Success, Supabase synced
- [ ] Update last name: Success, Supabase synced
- [ ] Update email: Success, Supabase synced
- [ ] Update username: Success
- [ ] Upload profile photo: Success

### 12.2 Security Tests

- [ ] Change password: Success
- [ ] View active sessions: Displays correctly
- [ ] Sign out all devices: Success

### 12.3 Account Deletion Tests

- [ ] Delete account (Free Tier): Account deleted, Supabase cleaned
- [ ] Delete account (Pro): Account deleted, subscription cancelled, Supabase cleaned

### 12.4 Webhook Tests

- [ ] user.updated: Supabase users table updated
- [ ] user.deleted (Free): User and analyses deleted from Supabase
- [ ] user.deleted (Pro): Billing key deleted, Toss subscription cancelled

## 13. Edge Cases

- **Webhook delay**: User sees updated info in Clerk immediately, Supabase syncs asynchronously
- **Webhook failure**: Clerk retry mechanism handles it
- **Account deletion with active Pro**: Subscription cancelled, no future charges
- **Concurrent updates**: Clerk handles race conditions

## 14. Dependencies

### 14.1 External Libraries

- `@clerk/nextjs` - UserProfile component
- Already installed

### 14.2 Internal Dependencies

- `/src/app/api/webhook/clerk/route.ts` - Webhook handler
- `/src/lib/toss/client.ts` - deleteBillingKey
- `/src/lib/supabase/queries.ts` - getUserByClerkId, getBillingKey

## 15. Security Considerations

### 15.1 Account Deletion

When user deletes account:
1. **Immediate actions**:
   - Clerk account deleted
   - User logged out
   - Session invalidated

2. **Webhook actions** (asynchronous):
   - Cancel Pro subscription (if exists)
   - Delete billing key from Toss Payments
   - Delete user data from Supabase
   - Delete all analyses
   - Delete payment history

3. **Data retention**:
   - No data retained after deletion (GDPR compliant)
   - Billing keys deleted from Toss Payments
   - All personal data removed

### 15.2 Webhook Security

- Webhook signature verification required
- Only accept webhooks from Clerk
- Handle errors gracefully (log and retry)

## 16. Customization Options

### 16.1 Hide Sections

Hide specific sections if not needed:
```tsx
<UserProfile
  routing="path"
  path="/account"
  hideNavigation={{
    security: false, // show security section
    account: false,  // show account section
  }}
/>
```

### 16.2 Redirect After Actions

Redirect after account deletion:
```tsx
<UserProfile
  afterSignOutUrl="/"
/>
```

## 17. Future Enhancements (Out of Scope)

- Custom account settings (beyond Clerk's features)
- Privacy settings (data download, etc.)
- Email preferences
- Notification settings
- Theme preferences (dark mode)

---

**Document Version**: v1.0
**Created**: 2025-10-25
**Author**: Plan Writer Agent
**Next Step**: Implement page.tsx with Clerk's UserProfile component
