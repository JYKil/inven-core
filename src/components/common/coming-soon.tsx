import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'

export function ComingSoon({
  title,
  description = '이 기능은 현재 개발 중입니다.',
}: {
  title: string
  description?: string
}) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Construction className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium text-foreground">준비 중입니다</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  )
}
