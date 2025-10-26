import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createPureClient } from '@/lib/supabase/server';
import { getUserByClerkId } from '@/lib/supabase/queries';
import { SUBSCRIPTION } from '@/constants/app';
import { nanoid } from 'nanoid';

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

    // Parse request body
    const body = await request.json();
    const {
      cardNumber,
      expiryMonth,
      expiryYear,
      birthOrBusinessNumber,
      passwordTwoDigits,
      customerKey,
      customerEmail,
      customerName,
    } = body;

    // Validate required fields
    if (!cardNumber || !expiryMonth || !expiryYear || !birthOrBusinessNumber || !passwordTwoDigits) {
      return NextResponse.json(
        { error: '모든 카드 정보를 입력해주세요' },
        { status: 400 }
      );
    }

    // Get Toss Payments secret key
    const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

    if (!secretKey) {
      console.error('TOSS_PAYMENTS_SECRET_KEY가 설정되지 않았습니다');
      return NextResponse.json(
        { error: '서버 설정 오류' },
        { status: 500 }
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

    // 테스트 모드: 실제 API 호출 없이 결제 시뮬레이션
    console.log('테스트 결제 시작...');

    // 테스트용 데이터 생성
    const orderId = `TEST_ORDER_${Date.now()}_${nanoid(10)}`;
    const paymentKey = `TEST_PAYMENT_${nanoid(20)}`;
    const billingKey = `TEST_BILLING_${nanoid(20)}`;

    console.log('테스트 결제 성공:', { orderId, paymentKey, billingKey });

    // Step 3: Save payment record
    const { error: paymentError } = await supabase.from('payments').insert({
      user_id: user.id,
      order_id: orderId,
      payment_key: paymentKey,
      amount: SUBSCRIPTION.PRO_PRICE,
      status: 'done',
    });

    if (paymentError) {
      console.error('결제 내역 저장 실패:', paymentError);
    }

    // Step 4: Update user subscription
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + SUBSCRIPTION.PRO_DURATION_DAYS);

    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'pro',
        subscription_ends_at: subscriptionEndsAt.toISOString(),
        analyses_remaining: SUBSCRIPTION.PRO_ANALYSES_COUNT,
        cancelled_at: null,
      })
      .eq('id', user.id);

    if (userUpdateError) {
      console.error('구독 정보 업데이트 실패:', userUpdateError);
      return NextResponse.json(
        { error: '구독 정보 업데이트에 실패했습니다' },
        { status: 500 }
      );
    }

    // Step 5: Save billing key for recurring payments
    await supabase.from('billing_keys').upsert({
      user_id: user.id,
      billing_key: billingKey,
    });

    console.log('결제 프로세스 완료');

    return NextResponse.json({
      success: true,
      orderId,
      paymentKey,
    });
  } catch (error) {
    console.error('결제 처리 중 오류:', error);
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
