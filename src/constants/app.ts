// Application-wide constants

// Subscription-related constants
export const SUBSCRIPTION = {
  FREE_ANALYSES_COUNT: 3,
  PRO_ANALYSES_COUNT: 10,
  PRO_PRICE: 3900,
  PRO_DURATION_DAYS: 30,
} as const;

// Model mapping by tier
export const MODEL_BY_TIER = {
  free: 'gemini-2.5-flash',
  pro: 'gemini-2.5-pro',
} as const;

// API timeouts (in milliseconds)
export const API_TIMEOUT = {
  GEMINI: 60000, // 60 seconds
  PAYMENT: 30000, // 30 seconds
} as const;
