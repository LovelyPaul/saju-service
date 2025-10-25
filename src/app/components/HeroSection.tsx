'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function HeroSection() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  return (
    <section className="container mx-auto px-4 py-20 text-center">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          AI가 분석하는 나의 사주
        </h1>
        <p className="text-xl text-muted-foreground">
          Google Gemini 기반, 전문적이고 상세한 사주 분석
        </p>
        <div className="flex justify-center gap-4 pt-4">
          {isSignedIn ? (
            <Button
              size="lg"
              onClick={() => router.push('/dashboard')}
            >
              대시보드로 이동
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={() => router.push('/sign-up')}
            >
              무료로 시작하기
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
