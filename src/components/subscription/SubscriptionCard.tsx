import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types/user';
import { calculateSubscriptionStatus } from '@/utils/subscription';
import { formatDate } from '@/utils/date';
import Link from 'next/link';

interface SubscriptionCardProps {
  user: User;
}

export function SubscriptionCard({ user }: SubscriptionCardProps) {
  const status = calculateSubscriptionStatus(user);

  const getStatusDisplay = () => {
    switch (status.type) {
      case 'free':
        return {
          tier: 'Free',
          badge: 'default' as const,
          description: '무료 요금제',
          details: `남은 분석: ${user.analyses_remaining}/3회`,
          cta: 'Pro 요금제로 업그레이드',
          ctaLink: '/subscription/upgrade',
        };
      case 'pro_active':
        return {
          tier: 'Pro',
          badge: 'default' as const,
          description: 'Pro 요금제 (활성)',
          details: `남은 분석: ${status.remaining}/10회 | 만료일: ${formatDate(status.endsAt.toISOString())}`,
          cta: '구독 관리',
          ctaLink: '/subscription',
        };
      case 'pro_cancelled':
        return {
          tier: 'Pro',
          badge: 'secondary' as const,
          description: 'Pro 요금제 (취소 예정)',
          details: `종료일: ${formatDate(status.endsAt.toISOString())} | 남은 분석: ${status.remaining}/10회`,
          cta: '구독 재개',
          ctaLink: '/subscription',
        };
      case 'pro_expired':
        return {
          tier: 'Free',
          badge: 'destructive' as const,
          description: 'Pro 구독 만료',
          details: '무료 요금제로 전환되었습니다',
          cta: 'Pro 요금제 재구독',
          ctaLink: '/subscription/upgrade',
        };
    }
  };

  const display = getStatusDisplay();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>구독 정보</CardTitle>
          <Badge variant={display.badge}>{display.tier}</Badge>
        </div>
        <CardDescription>{display.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{display.details}</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={display.ctaLink}>{display.cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
