import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-muted/50">
        <FolderOpen className="h-16 w-16 text-muted-foreground/50" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">아직 검사 내역이 없습니다</h3>
      <p className="mb-6 text-sm text-muted-foreground">
        첫 검사를 시작해보세요!
      </p>
      <Button asChild size="lg">
        <Link href="/analysis/new">새 검사하기</Link>
      </Button>
    </div>
  );
}
