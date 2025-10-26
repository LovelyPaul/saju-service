import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { createAnalysisSchema } from '@/schemas/analysis';
import { generateSajuAnalysis } from '@/lib/gemini/client';
import { MODEL_BY_TIER } from '@/constants/app';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { message: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = createAnalysisSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { message: '입력값이 올바르지 않습니다', errors: validationResult.error.errors },
        { status: 400 }
      );
    }

    const input = validationResult.data;

    // Get user from database
    const supabase = await createClient();
    const user = await getUserByClerkId(supabase, userId);

    if (!user) {
      return NextResponse.json(
        { message: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check analyses remaining
    if (user.analyses_remaining <= 0) {
      return NextResponse.json(
        { message: '남은 분석 횟수가 없습니다', code: 'ANALYSES_LIMIT_REACHED' },
        { status: 403 }
      );
    }

    // Check Pro subscription validity
    if (user.subscription_tier === 'pro') {
      const now = new Date();
      const endsAt = user.subscription_ends_at ? new Date(user.subscription_ends_at) : null;

      if (!endsAt || endsAt <= now) {
        return NextResponse.json(
          { message: 'Pro 구독이 만료되었습니다', code: 'SUBSCRIPTION_EXPIRED' },
          { status: 403 }
        );
      }
    }

    // Select model based on subscription tier
    const model = MODEL_BY_TIER[user.subscription_tier];

    // Generate analysis with Gemini
    let analysisResult: string;
    try {
      analysisResult = await generateSajuAnalysis({
        name: input.name,
        birthDate: input.birth_date,
        birthTime: input.birth_time,
        isLunar: input.is_lunar,
        gender: input.gender,
        additionalInfo: input.additional_info,
        model,
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { message: '분석 중 오류가 발생했습니다', code: 'GEMINI_API_ERROR' },
        { status: 500 }
      );
    }

    // Start transaction: Create analysis + Decrement count
    const { data: analysis, error: insertError } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        name: input.name,
        birth_date: input.birth_date,
        birth_time: input.birth_time || null,
        is_lunar: input.is_lunar,
        gender: input.gender,
        additional_info: input.additional_info || null,
        analysis_result: analysisResult,
        model_used: user.subscription_tier === 'pro' ? 'pro' : 'flash',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert analysis error:', insertError);
      return NextResponse.json(
        { message: '분석 결과 저장에 실패했습니다' },
        { status: 500 }
      );
    }

    // Decrement analyses remaining
    const { error: updateError } = await supabase
      .from('users')
      .update({ analyses_remaining: user.analyses_remaining - 1 })
      .eq('id', user.id)
      .gte('analyses_remaining', 1);

    if (updateError) {
      console.error('Update analyses_remaining error:', updateError);
      // Analysis already created, but count not decremented
      // This is acceptable - user got the analysis
    }

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { message: '서버 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
