'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">운명 계산기</span>
        </Link>

        {/* Center Navigation - Only on Home Page */}
        {isHomePage && (
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection('home')}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              홈
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              서비스
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              가격
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              FAQ
            </button>
          </nav>
        )}

        {/* Right Navigation */}
        <nav className="flex items-center gap-4">
          <SignedIn>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">대시보드</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
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
              <Button variant="ghost" size="sm">로그인</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">무료로 시작하기</Button>
            </SignUpButton>
          </SignedOut>
        </nav>
      </div>
    </header>
  );
}
