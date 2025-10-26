import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { AnalysisForm } from './components/AnalysisForm';

export default async function NewAnalysisPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    redirect('/dashboard');
  }

  // Check if user has analyses remaining
  if (user.analyses_remaining <= 0) {
    redirect('/subscription/upgrade');
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">새 사주 분석</h1>
        <p className="mt-2 text-muted-foreground">
          정보를 입력하시면 AI가 상세한 사주 분석을 제공합니다
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          남은 분석 횟수: {user.analyses_remaining}회
        </p>
      </div>

      <AnalysisForm userId={user.id} subscriptionTier={user.subscription_tier} />
    </div>
  );
}
