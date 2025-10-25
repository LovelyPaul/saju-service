// User-related types for the Saju Analysis Service

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro';

// User information (Database type)
export interface User {
  id: string;
  clerk_user_id: string;
  email: string;
  first_name: string | null;
  subscription_tier: SubscriptionTier;
  subscription_ends_at: string | null;
  analyses_remaining: number;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

// Subscription status (computed state)
export type SubscriptionStatus =
  | { type: 'free' }
  | { type: 'pro_active'; endsAt: Date; remaining: number }
  | { type: 'pro_cancelled'; endsAt: Date; remaining: number }
  | { type: 'pro_expired' };
