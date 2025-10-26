-- Manual user insertion for testing
-- Replace the values below with your actual Clerk user information

-- Example:
-- clerk_user_id: 'user_2abc123xyz456' (get this from http://localhost:3001/test-user-id)
-- email: 'your-email@gmail.com'
-- first_name: '홍길동'

INSERT INTO public.users (
  clerk_user_id,
  email,
  first_name,
  subscription_tier,
  analyses_remaining,
  created_at,
  updated_at
)
VALUES (
  '여기에_clerk_user_id_입력',  -- ← http://localhost:3001/test-user-id에서 확인한 ID로 교체
  'your-email@gmail.com',        -- ← 본인 이메일로 교체
  '홍길동',                      -- ← 본인 이름으로 교체
  'free',
  3,
  NOW(),
  NOW()
)
ON CONFLICT (clerk_user_id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  updated_at = NOW();

-- 삽입된 사용자 확인
SELECT
  id,
  clerk_user_id,
  email,
  first_name,
  subscription_tier,
  analyses_remaining,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
