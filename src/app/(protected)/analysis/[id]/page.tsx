import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId, getAnalysisById } from '@/lib/supabase/queries';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/utils/date';
import { User, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface AnalysisDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisDetailPage({ params }: AnalysisDetailPageProps) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = await createClient();
  const user = await getUserByClerkId(supabase, userId);

  if (!user) {
    redirect('/dashboard');
  }

  const analysis = await getAnalysisById(supabase, id, user.id);

  if (!analysis) {
    notFound();
  }

  const genderText = analysis.gender === 'male' ? '남성' : '여성';
  const calendarType = analysis.is_lunar ? '음력' : '양력';
  const modelBadge = analysis.model_used === 'pro' ? 'Pro' : 'Flash';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard">← 대시보드로 돌아가기</Link>
        </Button>
      </div>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{analysis.name}님의 사주 분석</CardTitle>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{genderText}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(analysis.birth_date)} ({calendarType})
                    {analysis.birth_time && ` ${analysis.birth_time}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{formatDateTime(analysis.created_at)} 분석</span>
                </div>
              </div>
            </div>
            <Badge variant={analysis.model_used === 'pro' ? 'default' : 'secondary'}>
              Gemini {modelBadge}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Analysis Result Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-slate max-w-none dark:prose-invert">
            <ReactMarkdown>{analysis.analysis_result}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Bottom CTA */}
      <div className="mt-6 flex justify-center">
        <Button asChild size="lg">
          <Link href="/analysis/new">새 분석하기</Link>
        </Button>
      </div>
    </div>
  );
}
