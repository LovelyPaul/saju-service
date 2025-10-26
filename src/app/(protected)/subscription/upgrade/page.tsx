import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SUBSCRIPTION } from '@/constants/app';
import { Check } from 'lucide-react';
import { CardPaymentForm } from './components/CardPaymentForm';

export default async function SubscriptionUpgradePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const clerkUser = await currentUser();
  const supabase = await createClient();
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    redirect('/dashboard');
  }

  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress || user.email;
  const userName = user.first_name || clerkUser?.firstName || '고객님';

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Pro 요금제 업그레이드</h1>
        <p className="mt-2 text-muted-foreground">
          더 정확하고 상세한 AI 사주 분석을 경험하세요
        </p>
      </div>

      <div className="space-y-6">
        {/* Pricing Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Pro 요금제</CardTitle>
            <CardDescription>
              <span className="text-3xl font-bold text-foreground">
                {SUBSCRIPTION.PRO_PRICE.toLocaleString()}원
              </span>
              <span className="text-muted-foreground">/월</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>매달 {SUBSCRIPTION.PRO_ANALYSES_COUNT}회 분석</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Gemini 2.5 Pro 모델 사용</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>더 깊이 있고 전문적인 분석</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>분석 내역 영구 보관</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>자동 정기결제</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>언제든지 구독 취소 가능</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Payment Widget */}
        <Card>
          <CardHeader>
            <CardTitle>결제 정보</CardTitle>
            <CardDescription>
              토스페이먼츠를 통해 안전하게 결제됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardPaymentForm
              userId={userId}
              userEmail={userEmail}
              userName={userName}
            />
          </CardContent>
        </Card>

        {/* Terms */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• 구독은 매달 자동으로 갱신됩니다</p>
              <p>• 다음 결제일 24시간 전까지 언제든지 취소 가능합니다</p>
              <p>• 취소 시 현재 구독 기간까지는 Pro 혜택을 이용하실 수 있습니다</p>
              <p>• 부분 환불은 제공되지 않습니다</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
