'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

export function HeroSection() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  return (
    <section id="home" className="container mx-auto px-4 py-20 text-center scroll-mt-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          운명 계산기
        </h1>
        <div className="space-y-4">
          <p className="text-xl text-muted-foreground">
            운명을 믿기 전에, AI로 먼저 계산하세요.
          </p>
          <p className="text-base text-muted-foreground">
            천간지지 124,416가지 조합을 데이터로 분석합니다.
          </p>
          <p className="text-base text-muted-foreground">
            당신의 사주에 숨겨진 패턴을 찾아드립니다.
          </p>
        </div>
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
