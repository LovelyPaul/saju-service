import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId, getUserAnalyses } from '@/lib/supabase/queries';
import { EmptyState } from './components/EmptyState';
import { AnalysesList } from './components/AnalysesList';

export default async function DashboardPage() {
  // Get authenticated user
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Fetch user and analyses data
  const supabase = await createClient();
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    // User not found in database (webhook might not have processed yet)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6">
          <h2 className="text-lg font-semibold">계정을 불러오는 중입니다</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            잠시 후 다시 시도해주세요. 문제가 계속되면 고객센터에 문의해주세요.
          </p>
        </div>
      </div>
    );
  }

  const analyses = await getUserAnalyses(supabase, user.id, { limit: 100 });

  return (
    <div className="h-full">
      <div className="border-b bg-background px-8 py-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          과거에 수행한 사주팔자 검사 내역을 확인할 수 있습니다.
        </p>
      </div>

      <div className="p-8">
        {analyses.length === 0 ? (
          <EmptyState />
        ) : (
          <AnalysesList initialAnalyses={analyses} />
        )}
      </div>
    </div>
  );
}
