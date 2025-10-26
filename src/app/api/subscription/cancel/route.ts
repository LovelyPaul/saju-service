import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPureClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: '로그인이 필요합니다' },
        { status: 401 }
      );
    }

    // Get user from database
    const supabase = await createPureClient();
    const user = await getUserByClerkId(supabase, userId);

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // Check if user has active Pro subscription
    if (user.subscription_tier !== 'pro') {
      return NextResponse.json(
        { error: 'Pro 구독이 없습니다' },
        { status: 400 }
      );
    }

    // Check if already cancelled
    if (user.cancelled_at) {
      return NextResponse.json(
        { error: '이미 취소된 구독입니다' },
        { status: 400 }
      );
    }

    // Mark subscription as cancelled
    const { error: updateError } = await supabase
      .from('users')
      .update({
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('구독 취소 실패:', updateError);
      return NextResponse.json(
        { error: '구독 취소에 실패했습니다' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '구독이 취소되었습니다',
    });
  } catch (error) {
    console.error('구독 취소 중 오류:', error);
    return NextResponse.json(
      { error: '구독 취소 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
