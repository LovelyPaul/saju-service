import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-background">
      <div className="container px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* About */}
          <div>
            <h3 className="mb-3 font-semibold">사주 분석 서비스</h3>
            <p className="text-sm text-muted-foreground">
              Google Gemini AI 기반의 전문적인 사주 분석 서비스
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 font-semibold">서비스</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  대시보드
                </Link>
              </li>
              <li>
                <Link href="/analysis/new" className="text-muted-foreground hover:text-foreground">
                  새 분석하기
                </Link>
              </li>
              <li>
                <Link href="/subscription" className="text-muted-foreground hover:text-foreground">
                  구독 관리
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="mb-3 font-semibold">지원</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/account" className="text-muted-foreground hover:text-foreground">
                  계정 관리
                </Link>
              </li>
              <li>
                <span className="text-muted-foreground">고객센터 (준비 중)</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 사주 분석 서비스. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
