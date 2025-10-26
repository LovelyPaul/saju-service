'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  userEmail?: string;
  subscriptionTier?: string;
}

export function Sidebar({ userEmail, subscriptionTier }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: '대시보드',
      href: '/dashboard',
      icon: Home,
    },
    {
      name: '새 검사',
      href: '/analysis/new',
      icon: Plus,
    },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-60 border-r bg-background">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">운명 계산기</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{userEmail || '사용자'}</p>
              <p className="text-xs text-muted-foreground">
                요금제: {subscriptionTier === 'pro' ? 'Pro' : 'Free'}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-3 w-full">
            <Link href="/subscription">
              <Settings className="mr-2 h-4 w-4" />
              구독 관리
            </Link>
          </Button>
        </div>

        {/* Footer */}
        <div className="border-t p-4 text-center text-xs text-muted-foreground">
          © 2025 사주 분석 서비스
        </div>
      </div>
    </aside>
  );
}
