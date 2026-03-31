import Link from 'next/link'
import { Users, Warehouse, Package, ClipboardList } from 'lucide-react'

const quickActions = [
  {
    title: '거래처 등록',
    description: '공급업체와 고객사를 등록하세요',
    href: '/partners/new',
    icon: Users,
  },
  {
    title: '창고 등록',
    description: '재고를 보관할 창고를 만드세요',
    href: '/warehouses/new',
    icon: Warehouse,
  },
  {
    title: '품목 등록',
    description: '관리할 품목을 추가하세요',
    href: '/items/new',
    icon: Package,
  },
  {
    title: '발주서 생성',
    description: '첫 발주서를 작성하세요',
    href: '/purchase-orders/new',
    icon: ClipboardList,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-foreground">
          대시보드
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          재고수불관리 시스템에 오신 것을 환영합니다.
        </p>
      </div>

      {/* 퀵 스타트 가이드 */}
      <div className="border border-border rounded-[8px] bg-card p-6">
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground">
          시작하기
        </h2>
        <p className="text-[13px] text-muted-foreground mt-1">
          아래 순서대로 기초 데이터를 등록하면 재고 관리를 시작할 수 있습니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {quickActions.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col gap-3 border border-border rounded-[6px] p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <action.icon className="h-4 w-4 text-text-secondary group-hover:text-primary transition-colors" />
              </div>
              <div>
                <div className="text-[14px] font-medium text-foreground">
                  {action.title}
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  {action.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
