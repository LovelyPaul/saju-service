import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: z.string().min(1).optional(),
});

const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  CLERK_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Toss Payments
  TOSS_PAYMENTS_SECRET_KEY: z.string().min(1).optional(),
  TOSS_PAYMENTS_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Gemini API
  GOOGLE_GEMINI_API_KEY: z.string().min(1).optional(),

  // Cron Job
  CRON_SECRET: z.string().min(1).optional(),
});

const _clientEnv = clientEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY,
});

const _serverEnv = serverEnvSchema.safeParse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
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
  console.warn('⚠️ 클라이언트 환경 변수 누락:', _clientEnv.error.flatten().fieldErrors);
  console.warn('일부 기능이 제한될 수 있습니다. .env.local 파일을 확인하세요.');
}

if (!_serverEnv.success) {
  console.warn('⚠️ 서버 환경 변수 누락:', _serverEnv.error.flatten().fieldErrors);
  console.warn('일부 기능이 제한될 수 있습니다. .env.local 파일을 확인하세요.');
}

export const env: ClientEnv = _clientEnv.success ? _clientEnv.data : {};
export const serverEnv: ServerEnv = _serverEnv.success ? _serverEnv.data : {};
