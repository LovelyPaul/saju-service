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
