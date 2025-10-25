import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl">결제가 완료되었습니다!</CardTitle>
          <CardDescription>
            Pro 요금제 구독이 시작되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">요금제</span>
                <span className="font-medium">Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">월 요금</span>
                <span className="font-medium">3,900원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">분석 횟수</span>
                <span className="font-medium">매달 10회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">사용 모델</span>
                <span className="font-medium">Gemini 2.5 Pro</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              이제 더 정확하고 상세한 AI 사주 분석을 이용하실 수 있습니다.
              대시보드에서 바로 새 분석을 시작해보세요!
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/subscription">구독 관리</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/analysis/new">새 분석하기</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
