import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: z.string().min(1),
});

const serverEnvSchema = z.object({
  // Clerk
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  // Toss Payments
  TOSS_PAYMENTS_SECRET_KEY: z.string().min(1),
  TOSS_PAYMENTS_WEBHOOK_SECRET: z.string().min(1),

  // Gemini API
  GOOGLE_GEMINI_API_KEY: z.string().min(1),

  // Cron Job
  CRON_SECRET: z.string().min(1),
});

const _clientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY,
});

const _serverEnv = serverEnvSchema.safeParse({
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  TOSS_PAYMENTS_SECRET_KEY: process.env.TOSS_PAYMENTS_SECRET_KEY,
  TOSS_PAYMENTS_WEBHOOK_SECRET: process.env.TOSS_PAYMENTS_WEBHOOK_SECRET,
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

if (!_clientEnv.success) {
  console.error('클라이언트 환경 변수 검증 실패:', _clientEnv.error.flatten().fieldErrors);
  throw new Error('클라이언트 환경 변수를 확인하세요.');
}

if (!_serverEnv.success) {
  console.error('서버 환경 변수 검증 실패:', _serverEnv.error.flatten().fieldErrors);
  throw new Error('서버 환경 변수를 확인하세요.');
}

export const env: ClientEnv = _clientEnv.data;
export const serverEnv: ServerEnv = _serverEnv.data;
