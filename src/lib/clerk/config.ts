import { env, serverEnv } from '@/constants/env';

// Public routes that don't require authentication
export const CLERK_PUBLIC_ROUTES = ['/'];

// Auth routes (sign-in, sign-up)
export const CLERK_AUTH_ROUTES = ['/sign-in', '/sign-up'];

// Clerk configuration
export const clerkConfig = {
  publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  secretKey: serverEnv.CLERK_SECRET_KEY,
  webhookSecret: serverEnv.CLERK_WEBHOOK_SECRET,
};
