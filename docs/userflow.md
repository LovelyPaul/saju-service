# 사주 분석 서비스 사용자 플로우 (User Flow)

## 개요
본 문서는 사주 분석 서비스의 기능별 사용자 플로우를 상세히 정의합니다. 각 플로우는 입력(Input), 처리(Process), 출력(Output) 단계로 구성되며, 엣지 케이스와 예외 상황을 포함합니다.

---

## 1. 회원가입 및 로그인 플로우

### 1.1 Google 회원가입

#### 입력
- 사용자가 홈페이지 또는 회원가입 페이지에서 "Google로 시작하기" 버튼 클릭
- Clerk의 Google OAuth 동의 화면에서 권한 승인

#### 처리
1. Clerk SDK가 Google OAuth 인증 프로세스 시작
2. 사용자가 Google 계정 선택 및 권한 승인
3. Clerk가 인증 토큰 생성 및 사용자 정보 수신
4. Clerk Webhook이 `user.created` 이벤트 발생
5. 백엔드 Webhook 핸들러가 이벤트 수신 및 서명 검증
6. Supabase `users` 테이블에 새 사용자 레코드 생성:
   - `clerk_user_id`: Clerk 사용자 ID
   - `email`: Google 이메일
   - `first_name`: 사용자 이름
   - `role`: `free_tier`
   - `subscription_status`: `active`
   - `free_analyses_remaining`: 3
   - `created_at`: 현재 시각
7. 세션 토큰 생성 및 클라이언트에 저장

#### 출력
- 성공 시: 대시보드 페이지로 자동 리다이렉트
- 실패 시:
  - Google 인증 실패: 에러 메시지 표시 및 재시도 옵션 제공
  - Webhook 실패: 사용자는 로그인되지만 대시보드에서 "초기화 중" 메시지 표시, 백그라운드에서 재시도

#### 엣지 케이스
- 이미 가입된 Google 계정: 자동으로 로그인 플로우로 전환
- Webhook 지연: 최대 5초 대기 후 대시보드로 이동, 백그라운드에서 사용자 정보 폴링
- 네트워크 오류: 에러 메시지 및 재시도 버튼 표시

### 1.2 Google 로그인

#### 입력
- 사용자가 로그인 페이지에서 "Google로 로그인" 버튼 클릭
- Google 계정 선택

#### 처리
1. Clerk SDK가 Google OAuth 인증 시작
2. 사용자 인증 후 세션 토큰 생성
3. Clerk가 기존 사용자 정보 로드
4. Supabase에서 사용자 구독 상태 조회

#### 출력
- 성공 시: 대시보드로 리다이렉트
- 실패 시: 에러 메시지 표시 및 재시도 옵션

#### 엣지 케이스
- 삭제된 계정으로 로그인 시도: "계정을 찾을 수 없습니다" 메시지 표시
- 세션 만료: 자동으로 로그인 페이지로 리다이렉트

---

## 2. 대시보드 (분석 목록) 플로우

### 2.1 대시보드 진입

#### 입력
- 사용자가 인증된 상태로 대시보드 페이지 접근
- 페이지 로드 요청

#### 처리
1. 미들웨어에서 인증 상태 확인
2. Clerk에서 현재 사용자 정보 조회
3. Supabase에서 사용자 구독 정보 조회:
   - `subscription_tier` (free_tier / pro)
   - `free_analyses_remaining` 또는 `pro_analyses_remaining`
   - `subscription_ends_at`
4. Supabase에서 사용자의 분석 내역 조회 (최신순 정렬)
5. 분석 결과 목록을 클라이언트에 전달

#### 출력
- 분석 내역이 없는 경우:
  - "아직 검사 이력이 없습니다. 첫 검사를 시작해보세요!" 메시지
  - "새 검사하기" 버튼 표시
  - 구독 상태 카드 표시 (남은 횟수 등)

- 분석 내역이 있는 경우:
  - 구독 상태 카드 (남은 횟수, 구독 만료일 등)
  - 분석 목록 카드 (각 카드에 이름, 분석 날짜, 간략 요약 표시)
  - 검색 입력 필드
  - "새 검사하기" 버튼

#### 엣지 케이스
- 인증되지 않은 사용자: 로그인 페이지로 리다이렉트
- Supabase 연결 실패: 로딩 상태 유지 및 재시도 로직, 3회 실패 시 에러 메시지
- 분석 내역이 100개 이상: 페이지네이션 적용 (10개씩)

### 2.2 분석 검색

#### 입력
- 사용자가 검색 입력 필드에 검색어 입력 (이름)
- 실시간 타이핑 또는 검색 버튼 클릭

#### 처리
1. 검색어가 입력될 때마다 디바운스 처리 (300ms)
2. Supabase에서 사용자의 분석 내역을 검색어로 필터링
   - `name` 필드에서 부분 일치 검색 (ILIKE)
3. 필터링된 결과를 클라이언트에 반환

#### 출력
- 검색 결과가 있는 경우: 필터링된 분석 목록 표시
- 검색 결과가 없는 경우: "검색 결과가 없습니다" 메시지
- 검색어 초기화 버튼 표시

#### 엣지 케이스
- 빈 검색어: 전체 목록 표시
- 특수 문자 입력: SQL Injection 방지, 안전하게 이스케이프 처리
- 검색 중 페이지 이탈: 검색 요청 취소

---

## 3. 새 분석하기 플로우

### 3.1 분석 정보 입력

#### 입력
- 사용자가 "새 검사하기" 버튼 클릭하여 분석 입력 페이지 진입
- 입력 폼 작성:
  - 이름 (텍스트 입력, 필수)
  - 생년월일 (날짜 선택기, 필수)
  - 음력/양력 선택 (라디오 버튼, 필수)
  - 출생시간 (시간 선택기 또는 "모름" 체크박스, 선택)
  - 성별 (라디오 버튼: 남성/여성, 필수)
  - 시간대 (드롭다운 또는 텍스트 입력, 선택, 예: Asia/Seoul)
  - 추가 요청사항 (텍스트 영역, 선택)
- "분석 시작" 버튼 클릭

#### 처리
1. 클라이언트 측 입력 검증:
   - 필수 필드 입력 여부 확인
   - 생년월일 형식 검증 (과거 날짜, 150년 이내)
   - 이름 길이 검증 (2-50자)
2. 서버로 분석 요청 전송
3. 서버 측 검증:
   - 사용자 인증 상태 확인
   - Supabase에서 사용자 구독 정보 조회
   - 남은 분석 횟수 확인:
     - Free Tier: `free_analyses_remaining > 0`
     - Pro: `pro_analyses_remaining > 0` AND `subscription_ends_at > NOW()`
4. 횟수 부족 시: 에러 응답 반환
5. 횟수 충분 시:
   - 사용자 구독 타입에 따라 Gemini 모델 선택:
     - Free Tier: `gemini-2.5-flash`
     - Pro: `gemini-2.5-pro`
   - 입력 데이터를 기반으로 프롬프트 생성 (`generateSajuAnalysisPrompt`)
   - Gemini API 호출 (타임아웃 60초)
   - 분석 결과 수신
6. Supabase 트랜잭션:
   - `analyses` 테이블에 새 레코드 생성:
     - `user_id`: 현재 사용자 ID
     - `name`: 입력된 이름
     - `birth_date`: 생년월일
     - `birth_time`: 출생시간 (또는 NULL)
     - `is_lunar`: 음력 여부
     - `gender`: 성별
     - `time_zone`: 시간대 (또는 NULL)
     - `additional_info`: 추가 요청사항
     - `analysis_result`: Gemini 응답 (Markdown)
     - `model_used`: 사용된 모델 (flash/pro)
     - `created_at`: 현재 시각
   - 사용자의 남은 분석 횟수 1 차감:
     - Free: `free_analyses_remaining - 1`
     - Pro: `pro_analyses_remaining - 1`
7. 생성된 분석 ID를 클라이언트에 반환

#### 출력
- 성공 시:
  - 로딩 UI 표시 ("AI가 분석 중입니다..." 메시지, 스피너 애니메이션)
  - 분석 완료 후 분석 상세보기 페이지로 리다이렉트

- 실패 시:
  - 입력 검증 실패: 해당 필드에 에러 메시지 표시 (인라인 검증)
  - 횟수 부족:
    - Free Tier: "무료 분석 횟수를 모두 사용했습니다. Pro 요금제로 업그레이드하시겠습니까?" 모달 + 업그레이드 버튼
    - Pro: "이번 달 분석 횟수를 모두 사용했습니다. 다음 달에 다시 이용해주세요." 메시지
  - Gemini API 실패: "분석 중 오류가 발생했습니다. 다시 시도해주세요." 메시지, 횟수 복구
  - 네트워크 오류: 에러 메시지 및 재시도 버튼

#### 엣지 케이스
- 출생시간 "모름" 선택 시: 프롬프트에 "출생시간 미상" 명시, 삼주 기반 분석
- Gemini API 타임아웃 (60초): "분석 시간이 초과되었습니다. 다시 시도해주세요." 메시지, 횟수 복구
- 중복 제출 방지: 분석 요청 중 버튼 비활성화
- 구독 만료 중 분석 시도: "구독이 만료되었습니다. 구독을 갱신해주세요." 메시지
- 동시에 여러 분석 요청: 서버 측에서 Rate Limiting 적용 (사용자당 분당 1회)

---

## 4. 분석 상세보기 플로우

### 4.1 분석 결과 조회

#### 입력
- 사용자가 대시보드에서 특정 분석 카드 클릭
- 또는 새 분석 완료 후 자동 리다이렉트
- URL 파라미터로 분석 ID 전달 (`/analysis/:id`)

#### 처리
1. 미들웨어에서 인증 상태 확인
2. Clerk에서 현재 사용자 정보 조회
3. Supabase에서 분석 ID로 분석 결과 조회
4. 분석 결과의 `user_id`와 현재 사용자 ID 비교 (권한 확인)
5. 권한이 있는 경우: 분석 결과 데이터 반환
6. 클라이언트에서 Markdown 렌더링

#### 출력
- 성공 시:
  - 분석 대상자 정보 (이름, 생년월일, 성별 등) 표시
  - Markdown 형식의 상세 분석 결과 렌더링:
    - 나의 원명 이해하기 (사주팔자, 오행, 일간, 십신)
    - 삶의 흐름 읽기 (대운, 세운)
    - 나의 잠재력 발휘하기 (성격, 재물운, 직업운, 연애운, 건강운, 개운법)
  - 분석 날짜 표시
  - 사용된 모델 표시 (Flash/Pro)
  - "대시보드로 돌아가기" 버튼
  - "새 분석하기" 버튼

- 실패 시:
  - 분석을 찾을 수 없음: "분석 결과를 찾을 수 없습니다" 메시지 + 대시보드로 돌아가기 버튼
  - 권한 없음: "이 분석 결과를 볼 권한이 없습니다" 메시지 + 대시보드로 리다이렉트
  - 네트워크 오류: 로딩 상태 유지 및 재시도

#### 엣지 케이스
- 잘못된 분석 ID: 404 페이지 표시
- 다른 사용자의 분석 결과 접근 시도: 권한 에러 및 대시보드로 리다이렉트
- Markdown 렌더링 오류: 원본 텍스트 표시

---

## 5. 구독 관리 플로우

### 5.1 구독 상태 조회

#### 입력
- 사용자가 "구독 관리" 메뉴 또는 버튼 클릭
- 구독 관리 페이지 진입

#### 처리
1. 미들웨어에서 인증 상태 확인
2. Clerk에서 현재 사용자 정보 조회
3. Supabase에서 사용자 구독 정보 상세 조회:
   - `subscription_tier`: free_tier / pro
   - `subscription_status`: active / cancelled / expired
   - `subscription_ends_at`: 구독 만료일
   - `free_analyses_remaining` 또는 `pro_analyses_remaining`
4. Pro 사용자인 경우: `billing_keys` 테이블에서 빌링키 존재 여부 확인
5. `payments` 테이블에서 최근 결제 내역 조회

#### 출력
- Free Tier 사용자:
  - 현재 구독 상태: "무료 요금제"
  - 남은 분석 횟수 표시 (예: "남은 무료 분석: 1/3회")
  - Pro 요금제 혜택 안내 (월 10회, Gemini Pro 모델, 3,900원/월)
  - "Pro 요금제로 업그레이드" 버튼

- Pro 사용자 (active):
  - 현재 구독 상태: "Pro 요금제"
  - 이번 달 남은 분석 횟수 (예: "남은 분석: 7/10회")
  - 다음 결제 예정일 표시
  - "구독 취소" 버튼
  - 결제 내역 테이블 (날짜, 금액, 상태)

- Pro 사용자 (cancelled):
  - 현재 구독 상태: "Pro 요금제 (취소 예정)"
  - 서비스 이용 종료일 표시
  - "구독 재개" 버튼

- Pro 사용자 (expired):
  - 현재 구독 상태: "만료됨"
  - "다시 구독하기" 버튼

#### 엣지 케이스
- 구독 정보 로딩 실패: 재시도 버튼 표시
- 결제 내역 없음: "아직 결제 내역이 없습니다" 메시지

### 5.2 Pro 요금제 업그레이드

#### 입력
- 사용자가 "Pro 요금제로 업그레이드" 버튼 클릭
- Pro 업그레이드 페이지 진입
- "지금 업그레이드하기" 버튼 클릭

#### 처리
1. Pro 업그레이드 페이지 로드:
   - Pro 요금제 혜택 표시
   - 가격 정보 (3,900원/월)
   - "주의, 구독 후 환불이 불가합니다." 경고 문구
2. "지금 업그레이드하기" 클릭 시:
   - 결제 페이지로 이동
   - 토스페이먼츠 결제 위젯 로드:
     - `clientKey`: 환경 변수에서 로드
     - `customerKey`: Clerk 사용자 ID
     - `amount`: 3900
     - `orderId`: UUID 생성
     - `orderName`: "사주 분석 서비스 Pro 구독"
     - `customerName`: Clerk 사용자 이름
     - `customerEmail`: Clerk 사용자 이메일
3. 결제 위젯 렌더링:
   - 결제 수단 선택 UI
   - 카드 정보 입력 필드
   - 이용 약관 동의 체크박스
4. 사용자가 결제 정보 입력 및 "결제하기" 버튼 클릭
5. 토스페이먼츠 SDK가 결제 요청:
   - 성공 시: `successUrl`로 리다이렉트 (쿼리 파라미터에 `paymentKey`, `orderId`, `amount` 포함)
   - 실패 시: `failUrl`로 리다이렉트 (쿼리 파라미터에 에러 정보 포함)

#### 출력
- 성공 시: `successUrl` 페이지로 리다이렉트 (다음 단계: 결제 승인)
- 실패 시: `failUrl` 페이지로 리다이렉트, 에러 메시지 표시

#### 엣지 케이스
- 결제 위젯 로딩 실패: "결제 위젯을 불러올 수 없습니다. 다시 시도해주세요." 메시지
- 이미 Pro 사용자인 경우: "이미 Pro 요금제를 사용 중입니다" 메시지 및 구독 관리 페이지로 리다이렉트
- 결제 중 페이지 이탈: 결제 미완료 상태, 토스페이먼츠에서 자동으로 결제 취소

### 5.3 결제 승인 및 구독 활성화

#### 입력
- 토스페이먼츠 결제 후 `successUrl`로 리다이렉트
- 쿼리 파라미터: `paymentKey`, `orderId`, `amount`

#### 처리
1. Success 페이지에서 쿼리 파라미터 추출
2. 서버 API (`/api/payments/confirm`)로 결제 승인 요청:
   - `paymentKey`, `orderId`, `amount`, `userId` (Clerk ID) 전송
3. 서버 측 처리:
   - 입력 검증 (필수 파라미터 존재 확인)
   - 토스페이먼츠 API로 결제 승인 요청:
     - URL: `https://api.tosspayments.com/v1/payments/confirm`
     - Method: POST
     - Authorization: `Basic Base64(TOSS_PAYMENTS_SECRET_KEY + ':')`
     - Body: `{ paymentKey, orderId, amount }`
   - 토스페이먼츠 응답 수신
   - 응답에서 `billingKey` 추출 (구독 결제용)
4. 결제 성공 시 Supabase 트랜잭션:
   - `payments` 테이블에 결제 레코드 생성:
     - `user_id`: 현재 사용자 ID
     - `order_id`: orderId
     - `payment_key`: paymentKey
     - `amount`: 3900
     - `status`: `done`
     - `method`: 카드 종류 (응답에서 추출)
     - `paid_at`: 결제 시각
   - `billing_keys` 테이블에 빌링키 저장 (upsert):
     - `user_id`: 현재 사용자 ID
     - `billing_key`: 토스페이먼츠에서 발급받은 빌링키
     - `card_company`: 카드사 정보
     - `card_number_masked`: 마스킹된 카드 번호
   - `users` 테이블 구독 정보 업데이트:
     - `subscription_tier`: `pro`
     - `subscription_status`: `active`
     - `subscription_ends_at`: 현재 시각 + 30일
     - `pro_analyses_remaining`: 10
     - `last_payment_at`: 현재 시각
5. 클라이언트에 성공 응답 반환

#### 출력
- 성공 시:
  - "Pro 요금제 구독이 완료되었습니다!" 메시지
  - 구독 혜택 안내 (월 10회, Gemini Pro)
  - "대시보드로 이동" 버튼
  - 자동으로 3초 후 대시보드로 리다이렉트

- 실패 시:
  - 토스페이먼츠 승인 실패: "결제 승인에 실패했습니다. 고객센터로 문의해주세요." 메시지
  - Supabase 업데이트 실패: "구독 활성화에 실패했습니다. 고객센터로 문의해주세요." 메시지 (결제는 완료, 수동 복구 필요)
  - 네트워크 오류: 에러 메시지 및 재시도 버튼

#### 엣지 케이스
- 중복 승인 요청: `orderId`로 중복 확인, 이미 처리된 경우 기존 결과 반환
- 금액 불일치: 서버에서 금액 검증, 불일치 시 에러 반환 및 결제 취소
- 빌링키 발급 실패: 결제는 완료되지만 다음 결제 시 재발급 필요, 로그 기록

### 5.4 구독 취소

#### 입력
- Pro 사용자가 구독 관리 페이지에서 "구독 취소" 버튼 클릭
- 확인 모달에서 "구독 취소 확정" 버튼 클릭

#### 처리
1. 확인 모달 표시:
   - "구독을 취소하시겠습니까?" 메시지
   - "구독을 취소하면 다음 결제일까지 서비스 이용이 가능하며, 이후 자동으로 무료 요금제로 전환됩니다." 안내
   - "취소" 및 "구독 취소 확정" 버튼
2. "구독 취소 확정" 클릭 시:
   - 서버 API (`/api/subscription/cancel`)로 취소 요청
3. 서버 측 처리:
   - 사용자 인증 확인
   - Supabase에서 사용자의 Pro 구독 상태 확인
   - `users` 테이블 업데이트:
     - `subscription_status`: `cancelled`
     - `cancellation_requested_at`: 현재 시각
   - `subscription_ends_at`는 유지 (다음 결제일까지 서비스 이용 가능)
4. 토스페이먼츠 빌링키 삭제는 `subscription_ends_at` 도달 시 Cron Job으로 처리

#### 출력
- 성공 시:
  - "구독이 취소되었습니다" 메시지
  - "다음 결제일(YYYY-MM-DD)까지 Pro 요금제를 이용할 수 있습니다." 안내
  - 구독 관리 페이지 새로고침
  - 상태가 "Pro 요금제 (취소 예정)"로 변경
  - "구독 재개" 버튼 표시

- 실패 시:
  - 구독 상태 확인 실패: "구독 정보를 확인할 수 없습니다" 메시지
  - 네트워크 오류: 에러 메시지 및 재시도 버튼

#### 엣지 케이스
- 이미 취소된 구독: "이미 취소된 구독입니다" 메시지
- Free Tier 사용자가 취소 시도: "구독 중인 요금제가 없습니다" 메시지

### 5.5 구독 재개

#### 입력
- 취소 예정 상태의 Pro 사용자가 "구독 재개" 버튼 클릭

#### 처리
1. 서버 API (`/api/subscription/resume`)로 재개 요청
2. 서버 측 처리:
   - 사용자 인증 확인
   - Supabase에서 사용자의 구독 상태 확인 (`subscription_status = cancelled`)
   - 빌링키가 여전히 유효한지 확인
   - `users` 테이블 업데이트:
     - `subscription_status`: `active`
     - `cancellation_requested_at`: NULL

#### 출력
- 성공 시:
  - "구독이 재개되었습니다" 메시지
  - 구독 관리 페이지 새로고침
  - 상태가 "Pro 요금제"로 변경
  - "구독 취소" 버튼 표시

- 실패 시:
  - 빌링키 만료: "결제 정보가 만료되었습니다. 다시 구독해주세요." 메시지
  - 네트워크 오류: 에러 메시지 및 재시도 버튼

#### 엣지 케이스
- 이미 활성 상태인 구독: "이미 활성 상태입니다" 메시지
- `subscription_ends_at` 이후 재개 시도: "구독이 만료되어 재개할 수 없습니다. 다시 구독해주세요." 메시지

### 5.6 정기결제 자동화 (Supabase Cron)

#### 입력
- Supabase Cron Job이 매일 02:00 KST에 자동 실행
- Next.js API 엔드포인트 호출: `POST /api/cron/recurring-payments`
- 요청 헤더에 인증 토큰 포함: `Authorization: Bearer ${CRON_SECRET}`

#### 처리
1. **API 인증 검증**:
   - 헤더의 `Authorization` 토큰 확인
   - `CRON_SECRET` 환경 변수와 비교
   - 불일치 시 HTTP 401 Unauthorized 반환

2. **결제 대상 조회**:
   - Supabase에서 오늘이 결제일인 구독 조회:
     ```sql
     SELECT u.id, u.clerk_user_id, bk.billing_key
     FROM users u
     JOIN billing_keys bk ON u.id = bk.user_id
     WHERE u.subscription_tier = 'pro'
       AND u.cancelled_at IS NULL
       AND DATE(u.subscription_ends_at) = CURRENT_DATE;
     ```

3. **각 구독건 결제 처리** (반복):
   - 사용자별로 try-catch 처리 (개별 실패가 전체를 중단시키지 않도록)

   **3-1. 토스페이먼츠 빌링키 결제 API 호출**:
   - URL: `POST /v1/billing/{billingKey}`
   - Authorization: `Basic Base64(TOSS_PAYMENTS_SECRET_KEY + ':')`
   - Body:
     ```json
     {
       "customerKey": "clerk_user_id",
       "amount": 3900,
       "orderId": "auto_renewal_{uuid}",
       "orderName": "사주 분석 서비스 Pro 구독 (자동갱신)"
     }
     ```

   **3-2. 결제 성공 시**:
   - Supabase 트랜잭션 시작
   - `payments` 테이블 INSERT:
     - `user_id`, `order_id`, `payment_key`, `amount`, `status = 'done'`
   - `users` 테이블 UPDATE:
     - `subscription_ends_at = subscription_ends_at + INTERVAL '30 days'`
     - `analyses_remaining = 10`
   - 트랜잭션 커밋
   - 로그 기록: "결제 성공: user_id={id}, amount=3900"
   - (선택사항) 사용자에게 결제 성공 이메일 발송

   **3-3. 결제 실패 시**:
   - Supabase 트랜잭션 시작
   - `payments` 테이블 INSERT:
     - `user_id`, `order_id`, `amount`, `status = 'failed'`
   - 구독 즉시 해지:
     - `users` 테이블 UPDATE:
       - `subscription_tier = 'free'`
       - `analyses_remaining = 0`
       - `subscription_ends_at = NULL`
       - `cancelled_at = NOW()`
   - `billing_keys` 테이블 DELETE:
     - `WHERE user_id = {user_id}`
   - 트랜잭션 커밋
   - 로그 기록: "결제 실패 및 구독 해지: user_id={id}, reason={error}"
   - 사용자에게 결제 실패 이메일 발송

4. **결과 집계**:
   - 총 처리 건수
   - 성공 건수
   - 실패 건수
   - 평균 처리 시간

5. **관리자 알림** (선택사항):
   - 실패 건수가 3건 이상 시 관리자 이메일 또는 Slack 알림

#### 출력
- HTTP 200 OK 응답:
  ```json
  {
    "success": true,
    "processed": 15,
    "succeeded": 14,
    "failed": 1,
    "duration_ms": 1250
  }
  ```

- 로그 예시:
  ```
  [Cron] Recurring payments started at 2025-10-25 02:00:00
  [Cron] Found 15 subscriptions to renew
  [Success] user_id=123, amount=3900, orderId=auto_renewal_abc
  [Failed] user_id=456, reason=카드 한도 초과
  [Cron] Completed: 14 succeeded, 1 failed, 1250ms
  ```

#### 엣지 케이스
- **인증 실패**: 잘못된 CRON_SECRET → HTTP 401, 로그 기록, 관리자 알림
- **결제 대상 없음**: 빈 배열 반환, "No subscriptions to renew" 로그
- **빌링키 없음**: 구독은 활성이지만 빌링키 누락 → 로그 경고, 구독 해지 않음 (수동 복구 대기)
- **토스페이먼츠 API 타임아웃**: 재시도 1회, 여전히 실패 시 해당 건만 실패 처리
- **Supabase 연결 오류**: 전체 Cron Job 실패, HTTP 500 반환, 다음날 재시도
- **중복 실행 방지**: Cron Job 실행 중 플래그 설정, 이미 실행 중이면 즉시 종료

---

## 6. 계정 관리 플로우

### 6.1 프로필 정보 조회 및 수정

#### 입력
- 사용자가 "계정 관리" 메뉴 클릭
- Clerk에서 제공하는 프로필 관리 UI 표시

#### 처리
1. Clerk SDK의 `<UserProfile />` 컴포넌트 렌더링
2. Clerk가 사용자 정보 자동 로드 및 표시
3. 사용자가 정보 수정 (이름, Username 등)
4. Clerk가 변경사항 저장 및 `user.updated` Webhook 발생
5. 백엔드 Webhook 핸들러가 Supabase `users` 테이블 업데이트

#### 출력
- 성공 시: "프로필이 업데이트되었습니다" 메시지 (Clerk UI 내부)
- 실패 시: Clerk가 에러 메시지 표시

#### 엣지 케이스
- Webhook 실패: Clerk와 Supabase 데이터 불일치, 백그라운드에서 재시도

### 6.2 비밀번호 설정/변경

#### 입력
- 사용자가 계정 관리 페이지에서 "보안" 탭 선택
- "비밀번호 변경" 버튼 클릭
- Clerk UI에서 비밀번호 입력

#### 처리
1. Clerk가 비밀번호 변경 프로세스 처리
2. 변경 완료 후 사용자에게 이메일 알림 (Clerk 자동)

#### 출력
- 성공 시: "비밀번호가 변경되었습니다" 메시지
- 실패 시: "비밀번호 변경에 실패했습니다" 메시지

#### 엣지 케이스
- 약한 비밀번호: Clerk가 자동으로 검증 및 에러 표시

### 6.3 계정 삭제

#### 입력
- 사용자가 계정 관리 페이지에서 "계정 삭제" 버튼 클릭
- 확인 모달에서 "삭제 확정" 버튼 클릭

#### 처리
1. Clerk가 계정 삭제 프로세스 시작
2. `user.deleted` Webhook 발생
3. 백엔드 Webhook 핸들러:
   - Supabase에서 사용자의 Pro 구독 상태 확인
   - Pro 사용자인 경우:
     - 토스페이먼츠 빌링키 삭제 API 호출
     - 구독 즉시 취소
   - Supabase `users` 테이블에서 사용자 레코드 삭제
   - 관련 데이터 삭제:
     - `analyses` 테이블: 사용자의 모든 분석 결과
     - `payments` 테이블: 결제 내역
     - `billing_keys` 테이블: 빌링키
4. Clerk 세션 무효화 및 로그아웃

#### 출력
- 성공 시: 홈페이지로 리다이렉트, "계정이 삭제되었습니다" 메시지
- 실패 시: "계정 삭제에 실패했습니다. 고객센터로 문의해주세요." 메시지

#### 엣지 케이스
- 구독 취소 실패: 계정은 삭제되지만 수동으로 구독 취소 필요, 로그 기록 및 관리자 알림
- Webhook 실패: 계정은 Clerk에서 삭제되지만 Supabase 데이터 남음, 백그라운드에서 정리 작업

---

## 7. Webhook 처리 플로우

### 7.1 Clerk Webhook: `user.created`

#### 입력
- Clerk가 새 사용자 가입 시 Webhook 이벤트 전송
- Endpoint: `/api/webhook/clerk`
- Headers: `svix-id`, `svix-timestamp`, `svix-signature`
- Body: JSON 이벤트 데이터

#### 처리
1. Webhook 핸들러에서 서명 검증:
   - `svix` 라이브러리 사용
   - `CLERK_WEBHOOK_SECRET`으로 검증
2. 서명 유효한 경우:
   - 이벤트 타입 확인 (`user.created`)
   - 사용자 정보 추출: `id`, `email_addresses`, `first_name`, `last_name`
3. Supabase `users` 테이블에 새 레코드 생성:
   - `clerk_user_id`: Clerk 사용자 ID
   - `email`: 이메일 주소
   - `first_name`, `last_name`: 이름
   - `role`: `free_tier`
   - `subscription_tier`: `free_tier`
   - `subscription_status`: `active`
   - `free_analyses_remaining`: 3
   - `created_at`: 현재 시각
4. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시:
  - 서명 검증 실패: HTTP 401 Unauthorized
  - Supabase 삽입 실패: HTTP 500 Internal Server Error (Clerk는 재시도)

#### 엣지 케이스
- 중복 이벤트: `clerk_user_id`를 UNIQUE 제약 조건으로 설정, 중복 시 무시
- 이메일 없음: 기본값 또는 NULL 처리

### 7.2 Clerk Webhook: `user.updated`

#### 입력
- Clerk가 사용자 정보 업데이트 시 Webhook 이벤트 전송

#### 처리
1. 서명 검증
2. 사용자 정보 추출
3. Supabase `users` 테이블 업데이트:
   - `clerk_user_id`로 사용자 찾기
   - `email`, `first_name`, `last_name` 업데이트
4. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시: HTTP 500 (Clerk 재시도)

#### 엣지 케이스
- 사용자 찾을 수 없음: 로그 기록, HTTP 200 반환 (무시)

### 7.3 Clerk Webhook: `user.deleted`

#### 입력
- Clerk가 사용자 계정 삭제 시 Webhook 이벤트 전송

#### 처리
1. 서명 검증
2. 사용자 ID 추출
3. Supabase에서 사용자 정보 조회
4. Pro 구독 중인 경우:
   - 토스페이먼츠 빌링키 삭제 API 호출
5. Supabase에서 사용자 관련 데이터 삭제:
   - `users` 테이블
   - `analyses` 테이블 (CASCADE 또는 명시적 삭제)
   - `payments` 테이블
   - `billing_keys` 테이블
6. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시: HTTP 500 (Clerk 재시도)

#### 엣지 케이스
- 빌링키 삭제 실패: 로그 기록, 관리자 알림, 수동 처리 필요
- 사용자 이미 삭제됨: HTTP 200 반환 (무시)

### 7.4 토스페이먼츠 Webhook: `PAYMENT_STATUS_DONE`

#### 입력
- 토스페이먼츠가 결제 성공 시 Webhook 이벤트 전송
- Endpoint: `/api/webhook/tosspayments`
- Headers: `x-tosspayments-webhook-secret`
- Body: JSON 이벤트 데이터

#### 처리
1. Webhook 핸들러에서 서명 검증:
   - HMAC SHA256 사용
   - `TOSS_PAYMENTS_WEBHOOK_SECRET`으로 검증
2. 이벤트 타입 확인 (`PAYMENT_STATUS_DONE`)
3. 결제 정보 추출: `orderId`, `paymentKey`, `amount`, `customerKey` (Clerk User ID)
4. Supabase 트랜잭션:
   - `payments` 테이블에서 `order_id`로 레코드 찾기 및 업데이트:
     - `status`: `done`
     - `paid_at`: 결제 시각
   - `users` 테이블에서 `clerk_user_id = customerKey`인 사용자 찾기 및 구독 연장:
     - `subscription_ends_at`: 현재 시각 + 30일 (또는 기존 만료일 + 30일)
     - `subscription_status`: `active`
     - `pro_analyses_remaining`: 10 (리셋)
5. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시: HTTP 500 (토스페이먼츠 재시도)

#### 엣지 케이스
- 중복 이벤트: `order_id`로 중복 확인, 이미 처리된 경우 무시
- 사용자 찾을 수 없음: 로그 기록, 관리자 알림

### 7.5 토스페이먼츠 Webhook: `PAYMENT_STATUS_CANCELLED`

#### 입력
- 토스페이먼츠가 결제 취소/환불 시 Webhook 이벤트 전송

#### 처리
1. 서명 검증
2. 이벤트 타입 확인 (`PAYMENT_STATUS_CANCELLED`)
3. 결제 정보 추출
4. Supabase 트랜잭션:
   - `payments` 테이블 업데이트: `status = cancelled`, `cancelled_at = NOW()`
   - `users` 테이블 업데이트: `subscription_status = cancelled`
5. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시: HTTP 500 (재시도)

#### 엣지 케이스
- 구독 즉시 종료 vs 기간 유지: 비즈니스 로직에 따라 `subscription_ends_at` 조정

### 7.6 토스페이먼츠 Webhook: `PAYMENT_STATUS_FAILED`

#### 입력
- 토스페이먼츠가 결제 실패 시 Webhook 이벤트 전송

#### 처리
1. 서명 검증
2. 이벤트 타입 확인 (`PAYMENT_STATUS_FAILED`)
3. 결제 정보 추출
4. Supabase 트랜잭션:
   - `payments` 테이블 업데이트: `status = failed`, `failed_at = NOW()`
5. 사용자에게 알림 (이메일 또는 앱 내 알림):
   - "결제에 실패했습니다. 결제 정보를 확인해주세요."
   - 재결제 링크 제공
6. HTTP 200 응답 반환

#### 출력
- 성공 시: HTTP 200 OK
- 실패 시: HTTP 500 (재시도)

#### 엣지 케이스
- 자동 재시도 로직: 설정에 따라 N회 재시도 (선택사항)

---

## 8. 예외 상황 및 에러 처리

### 8.1 구독 만료 처리 (Cron Job)

#### 입력
- 매일 자정 Cron Job 실행
- 또는 Supabase Edge Function / Vercel Cron 사용

#### 처리
1. Supabase에서 `subscription_ends_at < NOW()` AND `subscription_status = active` 사용자 조회
2. 각 사용자에 대해:
   - `subscription_status`: `expired`로 업데이트
   - `subscription_tier`: `free_tier`로 변경
   - `pro_analyses_remaining`: 0으로 리셋
   - `billing_keys` 테이블에서 빌링키 삭제
3. 사용자에게 이메일 알림: "Pro 구독이 만료되었습니다. 계속 이용하려면 재구독해주세요."

#### 출력
- 로그 기록: 만료 처리된 사용자 수

#### 엣지 케이스
- Cron Job 실패: 다음 실행 시 재처리

### 8.2 결제 재시도 로직 (선택사항)

#### 입력
- 결제 실패 후 N일 뒤 Cron Job 실행

#### 처리
1. Supabase에서 결제 실패한 사용자 조회
2. 빌링키가 유효한 경우:
   - 토스페이먼츠 API로 수동 결제 재시도
3. 성공 시: 구독 갱신
4. 실패 시: 사용자에게 알림

#### 출력
- 로그 기록

#### 엣지 케이스
- 빌링키 만료: 재시도 중단, 사용자에게 재등록 요청

### 8.3 Gemini API Rate Limit 처리

#### 입력
- 분석 요청 시 Gemini API가 Rate Limit 에러 반환 (HTTP 429)

#### 처리
1. 에러 응답 감지
2. 사용자에게 "현재 요청이 많아 처리가 지연되고 있습니다. 잠시 후 다시 시도해주세요." 메시지
3. 사용자 분석 횟수 복구 (차감 취소)
4. 로그 기록 및 관리자 알림

#### 출력
- 에러 메시지 및 재시도 버튼

#### 엣지 케이스
- 지속적인 Rate Limit: Gemini API 플랜 업그레이드 또는 요청 큐 시스템 도입

---

## 9. 주요 엣지 케이스 요약

### 9.1 인증 관련
- 세션 만료 중 페이지 이동: 자동 로그인 페이지 리다이렉트
- 동시 로그인 (여러 기기): Clerk가 자동으로 세션 관리
- 로그아웃 후 뒤로가기: 인증 미들웨어에서 차단

### 9.2 분석 관련
- 분석 중 네트워크 끊김: 타임아웃 후 에러 처리, 횟수 복구
- 동일한 정보로 중복 분석: 허용 (각 분석은 독립적)
- 분석 결과 저장 실패: 에러 메시지, 횟수 복구, 재시도 옵션

### 9.3 결제 관련
- 결제 중 페이지 새로고침: 토스페이먼츠에서 자동 처리, 중복 결제 방지
- 결제 승인 후 Supabase 업데이트 실패: 수동 복구 필요, 관리자 알림
- 빌링키 만료: 다음 결제 시 재발급 요청

### 9.4 데이터 동기화 관련
- Webhook 지연: 백그라운드에서 폴링 또는 재시도
- Clerk와 Supabase 데이터 불일치: 정기 동기화 Job 또는 수동 복구

---

## 10. 기능별 우선순위

### Phase 1 (MVP)
1. 회원가입 및 로그인
2. 대시보드 (기본)
3. 새 분석하기 (Gemini Flash)
4. 분석 상세보기

### Phase 2 (결제)
5. Pro 업그레이드
6. 결제 처리 및 승인
7. 구독 관리

### Phase 3 (최적화)
8. 분석 검색 기능
9. Gemini Pro 모델 통합
10. 에러 처리 강화
11. Cron Jobs (구독 만료 처리)

### Phase 4 (고급 기능)
12. 결제 재시도 로직
13. 이메일 알림
14. 통계 및 관리자 대시보드

---

**문서 버전**: v1.0
**작성일**: 2025-10-25
**작성자**: Userflow Writer Agent
