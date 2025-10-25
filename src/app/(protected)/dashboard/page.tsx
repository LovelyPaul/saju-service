import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId, getUserAnalyses } from '@/lib/supabase/queries';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { EmptyState } from './components/EmptyState';
import { AnalysesList } from './components/AnalysesList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

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
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">대시보드</h1>
            <p className="mt-2 text-muted-foreground">
              {user.first_name || user.email}님, 환영합니다
            </p>
          </div>
          {analyses.length > 0 && (
            <Button asChild size="lg">
              <Link href="/analysis/new">
                <Plus className="mr-2 h-4 w-4" />
                새 검사하기
              </Link>
            </Button>
          )}
        </div>

        {/* Subscription Card */}
        <SubscriptionCard user={user} />

        {/* Analyses Section */}
        <div>
          <h2 className="mb-4 text-2xl font-semibold">내 분석 내역</h2>
          {analyses.length === 0 ? (
            <EmptyState />
          ) : (
            <AnalysesList initialAnalyses={analyses} />
          )}
        </div>
      </div>
    </div>
  );
}
