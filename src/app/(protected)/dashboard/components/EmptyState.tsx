import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <CardTitle>아직 검사 이력이 없습니다</CardTitle>
        <CardDescription>
          첫 사주 분석을 시작해보세요!
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-center">
        <Button asChild size="lg">
          <Link href="/analysis/new">새 검사하기</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
