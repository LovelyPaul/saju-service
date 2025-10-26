import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { SUBSCRIPTION } from '@/constants/app';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '0원',
    description: '무료로 체험해보세요',
    features: [
      `${SUBSCRIPTION.FREE_ANALYSES_COUNT}회 무료 분석`,
      'Gemini 2.5 Flash 모델',
      '분석 내역 영구 보관',
      'Google 간편 로그인',
    ],
    cta: '무료로 시작하기',
    ctaLink: '/sign-up',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: `${SUBSCRIPTION.PRO_PRICE.toLocaleString()}원/월`,
    description: '더 정확한 분석을 원한다면',
    features: [
      `매달 ${SUBSCRIPTION.PRO_ANALYSES_COUNT}회 분석`,
      'Gemini 2.5 Pro 모델',
      '더 상세하고 정확한 분석',
      '분석 내역 영구 보관',
      '자동 정기결제',
      '언제든지 구독 취소 가능',
    ],
    cta: 'Pro로 업그레이드',
    ctaLink: '/subscription/upgrade',
    highlighted: true,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="container mx-auto px-4 py-20 scroll-mt-16">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold">요금제</h2>
        <p className="mt-4 text-muted-foreground">
          필요에 맞는 요금제를 선택하세요
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-2 lg:max-w-4xl lg:mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? 'border-primary shadow-lg' : ''}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant={plan.highlighted ? 'default' : 'outline'}
                size="lg"
                asChild
              >
                <Link href={plan.ctaLink}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
