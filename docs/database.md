# 사주 분석 서비스 데이터베이스 설계

## 개요
본 문서는 사주 분석 서비스의 최소 스펙 데이터베이스 스키마를 정의합니다. PostgreSQL을 사용하며, Supabase를 통해 관리됩니다.

**설계 원칙**:
- 요구사항에 명시된 기능만 포함
- 간결하면서도 확장 가능한 구조
- 불필요한 컬럼, 인덱스, 테이블 제거

---

## 1. 데이터 플로우 (Data Flow)

### 1.1 회원가입 플로우

```
[Clerk Google OAuth]
        ↓
[user.created Webhook]
        ↓
[users 테이블 INSERT]
  - clerk_user_id (UNIQUE)
  - email
  - first_name
  - subscription_tier = 'free'
  - analyses_remaining = 3
```

### 1.2 새 분석하기 플로우

```
[사용자 입력: 이름, 생년월일, 출생시간, 성별]
        ↓
[users.analyses_remaining 확인]
        ↓
[Gemini API 호출]
        ↓
[BEGIN TRANSACTION]
        ↓
[analyses INSERT] + [users.analyses_remaining - 1]
        ↓
[COMMIT]
```

### 1.3 Pro 구독 결제 플로우

```
[토스페이먼츠 결제 위젯]
        ↓
[결제 승인 + billingKey 발급]
        ↓
[BEGIN TRANSACTION]
        ↓
[payments INSERT]
[billing_keys UPSERT]
[users UPDATE]
  - subscription_tier = 'pro'
  - subscription_ends_at = NOW() + 30일
  - analyses_remaining = 10
        ↓
[COMMIT]
```

### 1.4 구독 취소 플로우

```
[사용자 취소 요청]
        ↓
[users UPDATE]
  - cancelled_at = NOW()
  (subscription_ends_at 유지)
        ↓
[Cron: subscription_ends_at 도달]
        ↓
[users UPDATE]
  - subscription_tier = 'free'
  - analyses_remaining = 0
[billing_keys DELETE]
```

### 1.5 계정 삭제 플로우

```
[user.deleted Webhook]
        ↓
[빌링키 삭제 API 호출]
        ↓
[users DELETE] (CASCADE)
  - analyses
  - payments
  - billing_keys
```

---

## 2. 데이터베이스 스키마

### 2.1 users (사용자 테이블)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Clerk 연동
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),

  -- 구독 정보
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free' or 'pro'
  subscription_ends_at TIMESTAMP WITH TIME ZONE,

  -- 분석 횟수 (free: 3회, pro: 10회/월)
  analyses_remaining INTEGER NOT NULL DEFAULT 3,

  -- 구독 취소 추적
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 필수 인덱스
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_subscription_ends ON users(subscription_ends_at)
  WHERE subscription_ends_at IS NOT NULL;
```

**필드 설명**:
- `clerk_user_id`: Clerk 사용자 ID (UNIQUE, Webhook 연동)
- `email`: 사용자 이메일
- `first_name`: 사용자 이름
- `subscription_tier`: 'free' 또는 'pro'
- `subscription_ends_at`: Pro 구독 만료일 (free는 NULL)
- `analyses_remaining`: 남은 분석 횟수 (free/pro 통합)
- `cancelled_at`: 구독 취소 요청 시각 (NULL이면 미취소)

**개선 사항**:
- `role`, `subscription_status` 제거: `subscription_tier`와 `subscription_ends_at`, `cancelled_at`로 모든 상태 표현 가능
- `free_analyses_remaining`, `pro_analyses_remaining` 통합: `analyses_remaining` 하나로 관리
- `last_name` 제거: 요구사항에 없음
- `last_payment_at` 제거: payments 테이블에서 조회 가능

### 2.2 analyses (분석 결과 테이블)

```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 분석 대상 정보
  name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  is_lunar BOOLEAN NOT NULL DEFAULT FALSE,
  gender VARCHAR(10) NOT NULL, -- 'male' or 'female'
  additional_info TEXT,

  -- 분석 결과
  analysis_result TEXT NOT NULL,
  model_used VARCHAR(50) NOT NULL, -- 'flash' or 'pro'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 필수 인덱스
CREATE INDEX idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_name ON analyses(user_id, name); -- 검색용
```

**필드 설명**:
- `user_id`: 분석 요청 사용자 (Foreign Key, CASCADE)
- `name`: 분석 대상자 이름
- `birth_date`: 생년월일
- `birth_time`: 출생시간 (NULL 가능)
- `is_lunar`: 음력 여부
- `gender`: 성별
- `additional_info`: 추가 요청사항
- `analysis_result`: Gemini 분석 결과 (Markdown)
- `model_used`: 사용된 모델 ('flash' 또는 'pro')

**개선 사항**:
- `time_zone` 제거: 요구사항에 명시되지 않음
- 모델명 단축: 'gemini-2.5-flash' → 'flash'

### 2.3 payments (결제 내역 테이블)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 토스페이먼츠 정보
  order_id VARCHAR(255) UNIQUE NOT NULL,
  payment_key VARCHAR(255) UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'done', 'cancelled', 'failed'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 필수 인덱스
CREATE INDEX idx_payments_user_id ON payments(user_id);
```

**필드 설명**:
- `order_id`, `payment_key`: 토스페이먼츠 식별자
- `amount`: 결제 금액
- `status`: 결제 상태

**개선 사항**:
- `method`, `paid_at`, `cancelled_at`, `failed_at` 제거: 요구사항에 구체적 사용 명시 없음, `created_at`과 `status`로 충분
- 인덱스 최소화: `order_id`, `payment_key`는 UNIQUE 제약으로 자동 인덱스 생성

### 2.4 billing_keys (빌링키 테이블)

```sql
CREATE TABLE billing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 토스페이먼츠 빌링키
  billing_key VARCHAR(255) UNIQUE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**필드 설명**:
- `user_id`: 사용자 ID (UNIQUE, 사용자당 1개)
- `billing_key`: 토스페이먼츠 빌링키

**개선 사항**:
- `card_company`, `card_number_masked` 제거: 요구사항에 표시 명시 없음
- `updated_at` 제거: 빌링키는 재발급 시 DELETE 후 INSERT
- 인덱스 제거: `user_id`는 UNIQUE로 자동 인덱스, `billing_key`도 UNIQUE로 자동 인덱스

---

## 3. 핵심 쿼리 패턴

### 3.1 회원가입 (Webhook)

```sql
INSERT INTO users (clerk_user_id, email, first_name)
VALUES ('clerk_abc123', 'user@example.com', 'John');
```

### 3.2 구독 정보 조회

```sql
SELECT
  subscription_tier,
  subscription_ends_at,
  cancelled_at,
  analyses_remaining
FROM users
WHERE clerk_user_id = 'clerk_abc123';
```

**상태 판별 로직** (애플리케이션 레벨):
- Free Tier: `subscription_tier = 'free'`
- Pro Active: `subscription_tier = 'pro' AND subscription_ends_at > NOW() AND cancelled_at IS NULL`
- Pro Cancelled: `subscription_tier = 'pro' AND subscription_ends_at > NOW() AND cancelled_at IS NOT NULL`
- Pro Expired: `subscription_tier = 'pro' AND subscription_ends_at <= NOW()`

### 3.3 새 분석 생성 (트랜잭션)

```sql
BEGIN;

-- 분석 결과 저장
INSERT INTO analyses (
  user_id, name, birth_date, birth_time, is_lunar, gender,
  additional_info, analysis_result, model_used
) VALUES (
  'user-uuid', '홍길동', '1990-01-01', '10:30:00', FALSE, 'male',
  '재물운 궁금', '# 분석 결과...', 'flash'
);

-- 횟수 차감 (동시성 제어)
UPDATE users
SET analyses_remaining = analyses_remaining - 1
WHERE id = 'user-uuid'
  AND analyses_remaining > 0;

COMMIT;
```

### 3.4 분석 목록 조회 (페이지네이션)

```sql
SELECT id, name, birth_date, gender, created_at
FROM analyses
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10 OFFSET 0;
```

### 3.5 분석 검색

```sql
SELECT id, name, birth_date, created_at
FROM analyses
WHERE user_id = 'user-uuid'
  AND name ILIKE '%홍길%'
ORDER BY created_at DESC;
```

### 3.6 Pro 구독 결제 (트랜잭션)

```sql
BEGIN;

INSERT INTO payments (user_id, order_id, payment_key, amount, status)
VALUES ('user-uuid', 'order123', 'payment456', 3900, 'done');

INSERT INTO billing_keys (user_id, billing_key)
VALUES ('user-uuid', 'billing789')
ON CONFLICT (user_id) DO UPDATE SET billing_key = EXCLUDED.billing_key;

UPDATE users
SET
  subscription_tier = 'pro',
  subscription_ends_at = NOW() + INTERVAL '30 days',
  analyses_remaining = 10,
  cancelled_at = NULL
WHERE id = 'user-uuid';

COMMIT;
```

### 3.7 구독 취소

```sql
UPDATE users
SET cancelled_at = NOW()
WHERE id = 'user-uuid';
```

### 3.8 정기결제 자동화 - 결제 대상 조회 (Cron Job)

```sql
-- 오늘이 결제일인 활성 Pro 구독 조회
SELECT
  u.id,
  u.clerk_user_id,
  u.subscription_ends_at,
  bk.billing_key
FROM users u
JOIN billing_keys bk ON u.id = bk.user_id
WHERE u.subscription_tier = 'pro'
  AND u.cancelled_at IS NULL
  AND DATE(u.subscription_ends_at) = CURRENT_DATE;
```

### 3.9 정기결제 성공 처리 (Cron Job)

```sql
BEGIN;

-- 결제 레코드 생성
INSERT INTO payments (user_id, order_id, payment_key, amount, status)
VALUES ('user-uuid', 'auto_renewal_123', 'payment_key_456', 3900, 'done');

-- 구독 연장 및 횟수 리셋
UPDATE users
SET
  subscription_ends_at = subscription_ends_at + INTERVAL '30 days',
  analyses_remaining = 10
WHERE id = 'user-uuid';

COMMIT;
```

### 3.10 정기결제 실패 및 구독 해지 (Cron Job)

```sql
BEGIN;

-- 결제 실패 레코드 생성
INSERT INTO payments (user_id, order_id, amount, status)
VALUES ('user-uuid', 'auto_renewal_123', 3900, 'failed');

-- 구독 해지
UPDATE users
SET
  subscription_tier = 'free',
  analyses_remaining = 0,
  subscription_ends_at = NULL,
  cancelled_at = NOW()
WHERE id = 'user-uuid';

-- 빌링키 삭제
DELETE FROM billing_keys
WHERE user_id = 'user-uuid';

COMMIT;
```

### 3.11 계정 삭제

```sql
DELETE FROM users WHERE clerk_user_id = 'clerk_abc123';
-- analyses, payments, billing_keys는 CASCADE로 자동 삭제
```

---

## 4. 제약 조건

### 4.1 CHECK 제약 조건

```sql
ALTER TABLE users
ADD CONSTRAINT check_subscription_tier
CHECK (subscription_tier IN ('free', 'pro'));

ALTER TABLE users
ADD CONSTRAINT check_analyses_remaining
CHECK (analyses_remaining >= 0);

ALTER TABLE analyses
ADD CONSTRAINT check_gender
CHECK (gender IN ('male', 'female'));

ALTER TABLE payments
ADD CONSTRAINT check_status
CHECK (status IN ('done', 'cancelled', 'failed'));

ALTER TABLE payments
ADD CONSTRAINT check_amount
CHECK (amount > 0);
```

### 4.2 트리거: updated_at 자동 업데이트

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

---

## 5. Row Level Security (RLS)

### 5.1 users 테이블

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (clerk_user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (clerk_user_id = auth.uid()::TEXT);
```

### 5.2 analyses 테이블

```sql
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analyses" ON analyses
FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT)
);

CREATE POLICY "Users can insert own analyses" ON analyses
FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT)
);
```

### 5.3 payments & billing_keys 테이블

```sql
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT)
);

CREATE POLICY "Users can view own billing keys" ON billing_keys
FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT)
);
```

---

## 6. 마이그레이션 DDL

```sql
-- 1. users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  analyses_remaining INTEGER NOT NULL DEFAULT 3,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_subscription_tier CHECK (subscription_tier IN ('free', 'pro')),
  CONSTRAINT check_analyses_remaining CHECK (analyses_remaining >= 0)
);

CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_subscription_ends ON users(subscription_ends_at)
  WHERE subscription_ends_at IS NOT NULL;

-- 2. analyses 테이블
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  birth_time TIME,
  is_lunar BOOLEAN NOT NULL DEFAULT FALSE,
  gender VARCHAR(10) NOT NULL,
  additional_info TEXT,
  analysis_result TEXT NOT NULL,
  model_used VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_gender CHECK (gender IN ('male', 'female'))
);

CREATE INDEX idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_name ON analyses(user_id, name);

-- 3. payments 테이블
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id VARCHAR(255) UNIQUE NOT NULL,
  payment_key VARCHAR(255) UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_status CHECK (status IN ('done', 'cancelled', 'failed')),
  CONSTRAINT check_amount CHECK (amount > 0)
);

CREATE INDEX idx_payments_user_id ON payments(user_id);

-- 4. billing_keys 테이블
CREATE TABLE billing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- 6. RLS 활성화 및 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
FOR SELECT USING (clerk_user_id = auth.uid()::TEXT);

CREATE POLICY "Users can update own data" ON users
FOR UPDATE USING (clerk_user_id = auth.uid()::TEXT);

CREATE POLICY "Users can view own analyses" ON analyses
FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT));

CREATE POLICY "Users can insert own analyses" ON analyses
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT));

CREATE POLICY "Users can view own payments" ON payments
FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT));

CREATE POLICY "Users can view own billing keys" ON billing_keys
FOR SELECT USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.uid()::TEXT));
```

---

## 7. 주요 개선 사항 요약

### 제거된 불필요한 요소

**users 테이블**:
- `role` 제거: `subscription_tier`와 중복
- `subscription_status` 제거: `subscription_tier`, `subscription_ends_at`, `cancelled_at`로 모든 상태 표현
- `free_analyses_remaining`, `pro_analyses_remaining` 통합: `analyses_remaining` 하나로 관리
- `last_name` 제거: 요구사항에 명시 없음
- `last_payment_at` 제거: payments 테이블에서 조회 가능

**analyses 테이블**:
- `time_zone` 제거: 요구사항에 명시 없음

**payments 테이블**:
- `method`, `paid_at`, `cancelled_at`, `failed_at` 제거: 핵심 기능에 불필요

**billing_keys 테이블**:
- `card_company`, `card_number_masked` 제거: 표시 요구사항 없음
- `updated_at` 제거: 빌링키는 교체 시 DELETE + INSERT

**인덱스 최적화**:
- 실제 쿼리 패턴에 필요한 인덱스만 유지
- UNIQUE 제약으로 자동 생성되는 인덱스는 명시하지 않음

### 유지된 핵심 기능

1. **회원 관리**: Clerk 연동, 구독 tier 관리
2. **분석 관리**: 생성, 조회, 검색
3. **결제 관리**: 토스페이먼츠 결제 및 빌링키
4. **구독 관리**: 업그레이드, 취소, 만료 처리

---

## 8. 확장 가능성

현재 설계는 최소 스펙이지만, 향후 필요 시 다음을 추가할 수 있습니다:

1. **notifications 테이블**: 사용자 알림
2. **referrals 테이블**: 추천인 시스템
3. **soft delete**: analyses에 `deleted_at` 추가
4. **파티셔닝**: analyses 테이블 월별 파티션

단, 실제 요구사항이 발생할 때까지 추가하지 않습니다.

---

**문서 버전**: v2.0 (최종)
**작성일**: 2025-10-25
**작성자**: Database Critic (CTO)
**DBMS**: PostgreSQL (Supabase)
**설계 철학**: 최소 스펙, 최대 효율, 확장 가능
