import { UserProfile } from '@clerk/nextjs';

export default function AccountPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">계정 관리</h1>
        <p className="mt-2 text-muted-foreground">
          프로필 정보와 보안 설정을 관리하세요
        </p>
      </div>

      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'shadow-none border',
          },
        }}
      />
    </div>
  );
}
