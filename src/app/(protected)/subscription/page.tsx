import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateSubscriptionStatus } from '@/utils/subscription';
import { formatDate } from '@/utils/date';
import { SUBSCRIPTION } from '@/constants/app';
import Link from 'next/link';

export default async function SubscriptionPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    redirect('/dashboard');
  }

  const status = calculateSubscriptionStatus(user);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">구독 관리</h1>
        <p className="mt-2 text-muted-foreground">
          현재 구독 정보를 확인하고 관리하세요
        </p>
      </div>

      <div className="space-y-6">
        {/* Current Subscription Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>현재 구독</CardTitle>
              <Badge variant={status.type === 'free' ? 'secondary' : 'default'}>
                {status.type === 'free' ? 'Free' : 'Pro'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {status.type === 'free' && (
              <>
                <div>
                  <p className="text-sm font-medium">요금제</p>
                  <p className="text-2xl font-bold">무료</p>
                </div>
                <div>
                  <p className="text-sm font-medium">남은 분석 횟수</p>
                  <p className="text-lg">{user.analyses_remaining}/{SUBSCRIPTION.FREE_ANALYSES_COUNT}회</p>
                </div>
                <div>
                  <p className="text-sm font-medium">사용 모델</p>
                  <p className="text-lg">Gemini 2.5 Flash</p>
                </div>
              </>
            )}

            {status.type === 'pro_active' && (
              <>
                <div>
                  <p className="text-sm font-medium">요금제</p>
                  <p className="text-2xl font-bold">Pro (활성)</p>
                </div>
                <div>
                  <p className="text-sm font-medium">월 요금</p>
                  <p className="text-lg">{SUBSCRIPTION.PRO_PRICE.toLocaleString()}원</p>
                </div>
                <div>
                  <p className="text-sm font-medium">남은 분석 횟수</p>
                  <p className="text-lg">{status.remaining}/{SUBSCRIPTION.PRO_ANALYSES_COUNT}회</p>
                </div>
                <div>
                  <p className="text-sm font-medium">다음 결제일</p>
                  <p className="text-lg">{formatDate(status.endsAt.toISOString())}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">사용 모델</p>
                  <p className="text-lg">Gemini 2.5 Pro</p>
                </div>
              </>
            )}

            {status.type === 'pro_cancelled' && (
              <>
                <div>
                  <p className="text-sm font-medium">요금제</p>
                  <p className="text-2xl font-bold">Pro (취소 예정)</p>
                </div>
                <div>
                  <p className="text-sm font-medium">남은 분석 횟수</p>
                  <p className="text-lg">{status.remaining}/{SUBSCRIPTION.PRO_ANALYSES_COUNT}회</p>
                </div>
                <div>
                  <p className="text-sm font-medium">종료일</p>
                  <p className="text-lg">{formatDate(status.endsAt.toISOString())}</p>
                </div>
                <div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    구독이 {formatDate(status.endsAt.toISOString())}에 종료됩니다.
                    이후 무료 요금제로 전환됩니다.
                  </p>
                </div>
              </>
            )}

            {status.type === 'pro_expired' && (
              <>
                <div>
                  <p className="text-sm font-medium">요금제</p>
                  <p className="text-2xl font-bold">Free (Pro 만료)</p>
                </div>
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <p className="text-sm text-destructive">
                    Pro 구독이 만료되어 무료 요금제로 전환되었습니다.
                  </p>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            {status.type === 'free' && (
              <Button asChild className="w-full">
                <Link href="/subscription/upgrade">Pro 요금제로 업그레이드</Link>
              </Button>
            )}

            {status.type === 'pro_active' && (
              <Button variant="destructive" className="w-full">
                구독 취소
              </Button>
            )}

            {status.type === 'pro_cancelled' && (
              <Button asChild className="w-full">
                <Link href="/subscription/upgrade">구독 재개</Link>
              </Button>
            )}

            {status.type === 'pro_expired' && (
              <Button asChild className="w-full">
                <Link href="/subscription/upgrade">Pro 요금제 재구독</Link>
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Pro Benefits Card */}
        {status.type === 'free' && (
          <Card>
            <CardHeader>
              <CardTitle>Pro 요금제 혜택</CardTitle>
              <CardDescription>더 정확하고 상세한 분석을 경험하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>매달 {SUBSCRIPTION.PRO_ANALYSES_COUNT}회 분석</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Gemini 2.5 Pro 모델 사용</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>더 깊이 있고 전문적인 분석</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>자동 정기결제로 편리한 관리</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
