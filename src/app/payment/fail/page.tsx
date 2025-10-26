import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailPage({
  searchParams,
}: {
  searchParams: { message?: string };
}) {
  const errorMessage = searchParams.message || '결제 처리 중 오류가 발생했습니다';

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">결제에 실패했습니다</CardTitle>
          <CardDescription>
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
            <h3 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">
              다음 사항을 확인해주세요
            </h3>
            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
              <li>• 카드 정보가 올바른지 확인해주세요</li>
              <li>• 카드 한도가 충분한지 확인해주세요</li>
              <li>• 카드사에서 결제를 차단하지 않았는지 확인해주세요</li>
              <li>• 문제가 계속되면 다른 결제 수단을 시도해보세요</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild className="flex-1">
            <Link href="/subscription/upgrade">다시 시도하기</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">대시보드로 이동</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
