import { auth } from '@clerk/nextjs/server';

export default async function TestUserIdPage() {
  const { userId } = await auth();

  return (
    <div className="container mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-4">현재 로그인한 Clerk User ID</h1>
      <div className="bg-muted p-4 rounded-lg">
        <p className="font-mono text-sm break-all">{userId || '로그인되지 않음'}</p>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        이 ID를 복사해서 Supabase users 테이블에 수동으로 추가하세요.
      </p>
    </div>
  );
}
