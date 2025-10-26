'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { SUBSCRIPTION } from '@/constants/app';
import { useRouter } from 'next/navigation';

const cardPaymentSchema = z.object({
  cardNumber: z.string()
    .min(15, '카드 번호를 입력해주세요')
    .max(16, '카드 번호는 최대 16자리입니다')
    .regex(/^\d+$/, '숫자만 입력 가능합니다'),
  expiryMonth: z.string()
    .length(2, 'MM 형식으로 입력해주세요')
    .regex(/^(0[1-9]|1[0-2])$/, '01-12 사이의 값을 입력해주세요'),
  expiryYear: z.string()
    .length(2, 'YY 형식으로 입력해주세요')
    .regex(/^\d{2}$/, '숫자 2자리를 입력해주세요'),
  birthOrBusinessNumber: z.string()
    .length(6, '생년월일 6자리를 입력해주세요')
    .regex(/^\d{6}$/, '숫자만 입력 가능합니다'),
  passwordTwoDigits: z.string()
    .length(2, '비밀번호 앞 2자리를 입력해주세요')
    .regex(/^\d{2}$/, '숫자만 입력 가능합니다'),
});

type CardPaymentInput = z.infer<typeof cardPaymentSchema>;

interface CardPaymentFormProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function CardPaymentForm({ userId, userEmail, userName }: CardPaymentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CardPaymentInput>({
    resolver: zodResolver(cardPaymentSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: CardPaymentInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Call API to create billing key and process first payment
      const response = await fetch('/api/payments/card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber: data.cardNumber,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          birthOrBusinessNumber: data.birthOrBusinessNumber,
          passwordTwoDigits: data.passwordTwoDigits,
          customerKey: userId,
          customerEmail: userEmail,
          customerName: userName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '결제 처리 중 오류가 발생했습니다');
      }

      // Redirect to success page
      router.push('/payment/success');
    } catch (err) {
      console.error('결제 오류:', err);
      setError(err instanceof Error ? err.message : '결제 처리 중 오류가 발생했습니다');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Card Number */}
      <div className="space-y-2">
        <Label htmlFor="cardNumber">카드 번호</Label>
        <Input
          id="cardNumber"
          type="text"
          placeholder="1234567812345678"
          maxLength={16}
          {...register('cardNumber')}
          className={errors.cardNumber ? 'border-destructive' : ''}
        />
        {errors.cardNumber && (
          <p className="text-sm text-destructive">{errors.cardNumber.message}</p>
        )}
      </div>

      {/* Expiry Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiryMonth">유효기간 (월)</Label>
          <Input
            id="expiryMonth"
            type="text"
            placeholder="MM"
            maxLength={2}
            {...register('expiryMonth')}
            className={errors.expiryMonth ? 'border-destructive' : ''}
          />
          {errors.expiryMonth && (
            <p className="text-sm text-destructive">{errors.expiryMonth.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiryYear">유효기간 (년)</Label>
          <Input
            id="expiryYear"
            type="text"
            placeholder="YY"
            maxLength={2}
            {...register('expiryYear')}
            className={errors.expiryYear ? 'border-destructive' : ''}
          />
          {errors.expiryYear && (
            <p className="text-sm text-destructive">{errors.expiryYear.message}</p>
          )}
        </div>
      </div>

      {/* Birth Date or Business Number */}
      <div className="space-y-2">
        <Label htmlFor="birthOrBusinessNumber">생년월일 (YYMMDD)</Label>
        <Input
          id="birthOrBusinessNumber"
          type="text"
          placeholder="901231"
          maxLength={6}
          {...register('birthOrBusinessNumber')}
          className={errors.birthOrBusinessNumber ? 'border-destructive' : ''}
        />
        {errors.birthOrBusinessNumber && (
          <p className="text-sm text-destructive">{errors.birthOrBusinessNumber.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          개인카드: 생년월일 6자리 / 법인카드: 사업자등록번호 10자리
        </p>
      </div>

      {/* Password Two Digits */}
      <div className="space-y-2">
        <Label htmlFor="passwordTwoDigits">카드 비밀번호 앞 2자리</Label>
        <Input
          id="passwordTwoDigits"
          type="password"
          placeholder="••"
          maxLength={2}
          {...register('passwordTwoDigits')}
          className={errors.passwordTwoDigits ? 'border-destructive' : ''}
        />
        {errors.passwordTwoDigits && (
          <p className="text-sm text-destructive">{errors.passwordTwoDigits.message}</p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !isValid}
        size="lg"
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            결제 진행 중...
          </>
        ) : (
          `월 ${SUBSCRIPTION.PRO_PRICE.toLocaleString()}원 결제하기`
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        안전한 결제를 위해 카드 정보는 암호화되어 전송됩니다
      </p>
    </form>
  );
}
