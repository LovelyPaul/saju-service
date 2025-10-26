'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Analysis } from '@/types/analysis';
import { formatDate, formatRelativeTime } from '@/utils/date';
import { User, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AnalysisCardProps {
  analysis: Analysis;
}

export function AnalysisCard({ analysis }: AnalysisCardProps) {
  const router = useRouter();

  const genderIcon = analysis.gender === 'male' ? '남성' : '여성';
  const modelBadge = analysis.model_used === 'pro' ? 'Pro' : 'Flash';

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-accent"
      onClick={() => router.push(`/analysis/${analysis.id}`)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-xl">{analysis.name}</CardTitle>
          <Badge variant={analysis.model_used === 'pro' ? 'default' : 'secondary'}>
            {modelBadge}
          </Badge>
        </div>
        <CardDescription className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{genderIcon}</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(analysis.birth_date)}</span>
            </div>
            {analysis.birth_time && (
              <span className="text-muted-foreground">({analysis.birth_time})</span>
            )}
          </div>
          <div className="text-xs">
            {formatRelativeTime(analysis.created_at)} 분석
          </div>
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
