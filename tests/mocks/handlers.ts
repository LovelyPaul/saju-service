import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  // 사주 분석 생성
  http.post('/api/analyses/create', async ({ request }) => {
    const body = await request.json();
    if (!body.name || body.name.length < 2) {
      return HttpResponse.json({ message: '이름은 최소 2자 이상이어야 합니다' }, { status: 400 });
    }
    await delay(1000); // 실제 API 지연 시뮬레이션
    return HttpResponse.json({ success: true, analysisId: `mock-${Date.now()}` });
  }),

  // Hono 예제 API
  http.get('/api/example/:id', ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      fullName: 'Mock User',
      avatarUrl: 'https://picsum.photos/200',
      bio: 'Test bio',
      updatedAt: new Date().toISOString(),
    });
  }),

  // Toss 결제
  http.post('/api/payments/card', async ({ request }) => {
    const body = await request.json();
    if (body.cardNumber === '4111111111111111') {
      return HttpResponse.json({ success: true, orderId: 'MOCK_ORDER', paymentKey: 'MOCK_KEY' });
    }
    return HttpResponse.json({ error: '결제 실패' }, { status: 400 });
  }),

  // 구독 취소
  http.post('/api/subscription/cancel', () => {
    return HttpResponse.json({ success: true, message: '구독 취소 완료' });
  }),
];
