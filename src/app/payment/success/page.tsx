import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { SUBSCRIPTION } from '@/constants/app';

export default function PaymentSuccessPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">결제가 완료되었습니다!</CardTitle>
          <CardDescription>
            Pro 구독이 성공적으로 활성화되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <h3 className="mb-3 font-semibold">구독 정보</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">요금제</span>
                <span className="font-medium">Pro</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">월 결제 금액</span>
                <span className="font-medium">{SUBSCRIPTION.PRO_PRICE.toLocaleString()}원</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">월 분석 횟수</span>
                <span className="font-medium">{SUBSCRIPTION.PRO_ANALYSES_COUNT}회</span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">사용 모델</span>
                <span className="font-medium">Gemini 2.5 Pro</span>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              💡 구독은 매달 자동으로 갱신됩니다. 언제든지 구독 관리 페이지에서 취소하실 수 있습니다.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/analysis/new">새 분석 시작하기</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
