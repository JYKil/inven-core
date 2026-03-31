import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* 폼 필드 */}
      <div className="space-y-4 max-w-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-24 mt-4" />
      </div>
    </div>
  )
}
