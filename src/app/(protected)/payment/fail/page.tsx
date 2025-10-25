import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">결제에 실패했습니다</CardTitle>
          <CardDescription>
            결제 처리 중 문제가 발생했습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
            <p className="text-sm text-red-800 dark:text-red-200">
              결제가 정상적으로 처리되지 않았습니다.
              잠시 후 다시 시도해주시거나, 문제가 계속되면 고객센터로 문의해주세요.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">결제 실패 시 확인사항:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>카드 정보가 정확한지 확인해주세요</li>
              <li>카드 한도가 충분한지 확인해주세요</li>
              <li>해외 결제가 차단되어 있지 않은지 확인해주세요</li>
              <li>인터넷 연결 상태를 확인해주세요</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/dashboard">대시보드로</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/subscription/upgrade">다시 시도</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
