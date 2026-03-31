import Link from 'next/link'
import { Users, Warehouse, Package, ClipboardList, ArrowRight } from 'lucide-react'

const steps = [
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
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-[28px] font-bold tracking-[-0.02em] text-foreground">
          대시보드
        </h1>
        <p className="text-[14px] text-text-secondary mt-1">
          재고수불관리 시스템에 오신 것을 환영합니다.
        </p>
      </div>

      {/* 온보딩 스테퍼 */}
      <section>
        <h2 className="font-heading text-[20px] font-semibold tracking-[-0.01em] text-foreground mb-1">
          시작하기
        </h2>
        <p className="text-[13px] text-muted-foreground mb-6">
          아래 순서대로 기초 데이터를 등록하면 재고 관리를 시작할 수 있습니다.
        </p>

        <ol className="space-y-0">
          {steps.map((step, i) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="group flex items-center gap-4 py-3 border-b border-border hover:bg-card/60 transition-colors -mx-2 px-2 rounded-[6px]"
              >
                {/* 번호 */}
                <span className="flex-shrink-0 w-7 h-7 rounded-full border-[1.5px] border-border flex items-center justify-center text-xs font-data font-medium text-text-secondary group-hover:border-primary group-hover:text-primary transition-colors">
                  {i + 1}
                </span>

                {/* 아이콘 */}
                <step.icon className="flex-shrink-0 h-4 w-4 text-text-secondary group-hover:text-primary transition-colors" />

                {/* 텍스트 */}
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] font-medium text-foreground">{step.title}</span>
                  <span className="text-[12px] text-muted-foreground ml-3">{step.description}</span>
                </div>

                {/* 화살표 */}
                <ArrowRight className="flex-shrink-0 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
