'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAnalysisSchema } from '@/schemas/analysis';
import type { CreateAnalysisInput } from '@/schemas/analysis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface AnalysisFormProps {
  userId: string;
  subscriptionTier: 'free' | 'pro';
}

export function AnalysisForm({ userId, subscriptionTier }: AnalysisFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEstimatedTime = () => {
    return subscriptionTier === 'pro' ? '3~5분' : '5~10분';
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<CreateAnalysisInput>({
    resolver: zodResolver(createAnalysisSchema),
    mode: 'onChange',
    defaultValues: {
      is_lunar: false,
      gender: 'male',
    },
  });

  const onSubmit = async (data: CreateAnalysisInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/analyses/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '분석 생성에 실패했습니다');
      }

      const result = await response.json();
      router.push(`/analysis/${result.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setIsSubmitting(false);
    }
  };

  const birthTimeUnknown = watch('birth_time') === undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>사주 분석 정보 입력</CardTitle>
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">예상 분석 시간:</span> {getEstimatedTime()}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              AI가 정확한 사주 분석을 위해 신중하게 해석하고 있습니다. 분석이 완료되면 알림을 보내드립니다.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="홍길동"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="birth_date">생년월일 *</Label>
            <Input
              id="birth_date"
              type="date"
              {...register('birth_date')}
              disabled={isSubmitting}
            />
            {errors.birth_date && (
              <p className="text-sm text-destructive">{errors.birth_date.message}</p>
            )}
          </div>

          {/* Lunar/Solar */}
          <div className="space-y-2">
            <Label>음력/양력 *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="false"
                  {...register('is_lunar', {
                    setValueAs: (v) => v === 'true' || v === true,
                  })}
                  disabled={isSubmitting}
                  defaultChecked
                />
                <span>양력</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="true"
                  {...register('is_lunar', {
                    setValueAs: (v) => v === 'true' || v === true,
                  })}
                  disabled={isSubmitting}
                />
                <span>음력</span>
              </label>
            </div>
          </div>

          {/* Birth Time */}
          <div className="space-y-2">
            <Label htmlFor="birth_time">출생시간 (선택)</Label>
            <Input
              id="birth_time"
              type="time"
              {...register('birth_time')}
              disabled={isSubmitting}
              placeholder="모름"
            />
            <p className="text-xs text-muted-foreground">
              출생시간을 모르시는 경우 비워두시면 삼주 기반 분석이 진행됩니다
            </p>
            {errors.birth_time && (
              <p className="text-sm text-destructive">{errors.birth_time.message}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>성별 *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="male"
                  {...register('gender')}
                  disabled={isSubmitting}
                />
                <span>남성</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="female"
                  {...register('gender')}
                  disabled={isSubmitting}
                />
                <span>여성</span>
              </label>
            </div>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender.message}</p>
            )}
          </div>

          {/* Additional Info */}
          <div className="space-y-2">
            <Label htmlFor="additional_info">추가 요청사항 (선택)</Label>
            <Textarea
              id="additional_info"
              {...register('additional_info')}
              placeholder="특별히 궁금한 점이나 집중적으로 봐주었으면 하는 부분을 적어주세요"
              rows={4}
              disabled={isSubmitting}
            />
            {errors.additional_info && (
              <p className="text-sm text-destructive">{errors.additional_info.message}</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI가 분석 중입니다...
              </>
            ) : (
              '분석 시작'
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
