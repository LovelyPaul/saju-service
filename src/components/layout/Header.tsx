'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">사주 분석</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <SignedIn>
            <Button asChild variant="ghost">
              <Link href="/dashboard">대시보드</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/subscription">구독 관리</Link>
            </Button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9',
                },
              }}
              afterSignOutUrl="/"
            />
          </SignedIn>

          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="ghost">로그인</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button>무료로 시작하기</Button>
            </SignUpButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
