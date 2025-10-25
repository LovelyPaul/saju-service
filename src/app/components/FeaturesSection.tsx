import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, DollarSign, History, LogIn } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI 기반 정확한 분석',
    description: 'Google Gemini AI가 25년 경력 전문가의 관점으로 사주팔자를 분석합니다.',
  },
  {
    icon: DollarSign,
    title: '합리적인 가격',
    description: '무료로 3회 체험 후, 월 3,900원으로 매달 10회 이용 가능합니다.',
  },
  {
    icon: History,
    title: '분석 내역 보관 및 관리',
    description: '모든 분석 내역이 자동 저장되어 언제든지 다시 확인할 수 있습니다.',
  },
  {
    icon: LogIn,
    title: '간편한 Google 로그인',
    description: 'Google 계정으로 간편하게 가입하고 바로 시작하세요.',
  },
];

export function FeaturesSection() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold">왜 저희 서비스를 선택해야 하나요?</h2>
        <p className="mt-4 text-muted-foreground">
          AI 기술과 전통 명리학의 만남
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title}>
              <CardHeader>
                <Icon className="mb-2 h-10 w-10 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
