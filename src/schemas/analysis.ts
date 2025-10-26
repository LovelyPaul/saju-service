import { z } from 'zod';

export const createAnalysisSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'),
  birth_time: z.string().regex(/^\d{2}:\d{2}$/, '올바른 시간 형식이 아닙니다 (HH:MM)').optional().or(z.literal('')),
  is_lunar: z.boolean(),
  gender: z.enum(['male', 'female'], {
    errorMap: () => ({ message: '성별을 선택해주세요' }),
  }),
  additional_info: z.string().max(500, '추가 정보는 최대 500자까지 입력 가능합니다').optional(),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
