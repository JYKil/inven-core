// 인증 페이지 전용 레이아웃 (사이드바 없음)
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-foreground">
            inven-core
          </h1>
          <p className="text-[14px] text-text-secondary mt-1">
            재고수불관리 시스템
          </p>
        </div>

        {/* 카드 */}
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
