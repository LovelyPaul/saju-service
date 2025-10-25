import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import type { User, SubscriptionStatus } from '@/types/user';
import type { Analysis } from '@/types/analysis';
import type { BillingKey } from '@/types/payment';
import { calculateSubscriptionStatus } from '@/utils/subscription';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Get user by Clerk user ID
 * @param supabase - Supabase client
 * @param clerkUserId - Clerk user ID
 * @returns User object or null if not found
 */
export async function getUserByClerkId(
  supabase: SupabaseClientType,
  clerkUserId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data as User;
}

/**
 * Get subscription status for a user
 * @param supabase - Supabase client
 * @param userId - User ID (Supabase UUID)
 * @returns Subscription status
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClientType,
  userId: string
): Promise<SubscriptionStatus | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching subscription status:', error);
    return null;
  }

  return calculateSubscriptionStatus(data as User);
}

export interface GetAnalysesOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Get user's analyses with optional pagination and search
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param options - Query options (limit, offset, search)
 * @returns Array of analyses
 */
export async function getUserAnalyses(
  supabase: SupabaseClientType,
  userId: string,
  options?: GetAnalysesOptions
): Promise<Analysis[]> {
  let query = supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Apply search filter
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  // Apply pagination
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 10) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching analyses:', error);
    return [];
  }

  return (data as Analysis[]) || [];
}

/**
 * Get analysis by ID (with user verification)
 * @param supabase - Supabase client
 * @param analysisId - Analysis ID
 * @param userId - User ID for verification
 * @returns Analysis object or null
 */
export async function getAnalysisById(
  supabase: SupabaseClientType,
  analysisId: string,
  userId: string
): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching analysis:', error);
    return null;
  }

  return data as Analysis;
}

/**
 * Get billing key for a user
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns Billing key object or null
 */
export async function getBillingKey(
  supabase: SupabaseClientType,
  userId: string
): Promise<BillingKey | null> {
  const { data, error } = await supabase
    .from('billing_keys')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching billing key:', error);
    return null;
  }

  return data as BillingKey;
}

/**
 * Get users with subscriptions due today for recurring payment
 * @param supabase - Supabase client (must have service role key)
 * @returns Array of users with billing keys
 */
export async function getUsersDueForPayment(
  supabase: SupabaseClientType
): Promise<Array<User & { billing_key: string }>> {
  const { data, error } = await supabase.rpc('get_users_due_for_payment');

  if (error) {
    console.error('Error fetching users due for payment:', error);
    return [];
  }

  return data || [];
}
