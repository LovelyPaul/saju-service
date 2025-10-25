import type { User, SubscriptionStatus } from '@/types/user';

/**
 * Calculate subscription status from user data
 * @param user - User object from database
 * @returns Computed subscription status
 */
export function calculateSubscriptionStatus(user: User): SubscriptionStatus {
  // Free tier
  if (user.subscription_tier === 'free') {
    return { type: 'free' };
  }

  // Pro tier
  if (user.subscription_tier === 'pro') {
    const endsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;
    const now = new Date();

    // Pro expired
    if (!endsAt || endsAt <= now) {
      return { type: 'pro_expired' };
    }

    // Pro cancelled (but still active until end date)
    if (user.cancelled_at !== null) {
      return {
        type: 'pro_cancelled',
        endsAt,
        remaining: user.analyses_remaining,
      };
    }

    // Pro active
    return {
      type: 'pro_active',
      endsAt,
      remaining: user.analyses_remaining,
    };
  }

  // Fallback to free (should not happen)
  return { type: 'free' };
}
