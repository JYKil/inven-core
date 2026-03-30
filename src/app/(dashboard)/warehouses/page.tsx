'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { useWarehouses, type WarehouseFilters } from '@/hooks/use-warehouses'

export default function WarehousesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<WarehouseFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useWarehouses(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="창고">
        <Button render={<Link href="/warehouses/new" />} className="bg-[#D4642A] hover:bg-[#BF5520]">
            <Plus className="h-4 w-4 mr-1" />
            창고 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="창고코드, 창고명 검색..."
        />
      </div>

      <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F5F0EB]/50">
              <TableHead className="text-xs font-medium text-[#6B6158]">코드</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">창고명</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">위치</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">연락처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <EmptyState
                    title="창고가 없습니다"
                    actionLabel="첫 창고 등록하기"
                    actionHref="/warehouses/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((wh) => (
                <TableRow
                  key={wh.id}
                  className="cursor-pointer hover:bg-[#F5F0EB]/30 h-9"
                  onClick={() => router.push(`/warehouses/${wh.id}`)}
                >
                  <TableCell className="text-[13px] font-data font-medium">{wh.code}</TableCell>
                  <TableCell className="text-[13px] font-medium">{wh.name}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{wh.location || '-'}</TableCell>
                  <TableCell className="text-[13px] text-[#6B6158]">{wh.phone || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <DataTablePagination
          page={data.page}
          pageSize={data.pageSize}
          totalCount={data.count}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
        />
      )}
    </div>
  )
}
