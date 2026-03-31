'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, AlertTriangle, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { formatQty } from '@/lib/format'
import { useItems, type ItemFilters } from '@/hooks/use-items'

export default function ItemsPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<ItemFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useItems(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="품목 관리">
        <Button render={<Link href="/items/new" />} className="bg-[#D4642A] hover:bg-[#BF5520]">
            <Plus className="h-4 w-4 mr-1" />
            품목 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="품목코드, 품목명 검색..."
        />
        <Select
          value={filters.itemType ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, itemType: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 유형', basic: '기초 품목', assembly: '조립 품목' }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="전체 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="basic">기초 품목</SelectItem>
            <SelectItem value="assembly">조립 품목</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-[#E0D8CF] rounded-[8px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F5F0EB]/50">
              <TableHead className="text-xs font-medium text-[#6B6158]">코드</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">품목명</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">유형</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">단위</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158]">카테고리</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158] text-right">현재고</TableHead>
              <TableHead className="text-xs font-medium text-[#6B6158] w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="품목이 없습니다"
                    actionLabel="첫 품목 등록하기"
                    actionHref="/items/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((item: any) => {
                // inventory_summary에서 총 재고 합산
                const totalQty = Array.isArray(item.inventory_summary)
                  ? item.inventory_summary.reduce((sum: number, s: any) => sum + (s.total_qty ?? 0), 0)
                  : 0
                const isLow = item.min_stock_qty > 0 && totalQty < item.min_stock_qty

                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-[#F5F0EB]/30 h-9"
                    onClick={() => router.push(`/items/${item.id}`)}
                  >
                    <TableCell className="text-[13px] font-data font-medium">{item.code}</TableCell>
                    <TableCell className="text-[13px] font-medium">{item.name}</TableCell>
                    <TableCell className="text-[13px]">
                      {item.item_type === 'assembly' ? (
                        <Badge variant="outline" className="rounded-[3px] border-[1.5px] border-[#4A7B94] text-[#4A7B94] text-xs">
                          <Wrench className="h-3 w-3 mr-1" />조립
                        </Badge>
                      ) : (
                        <span className="text-[#6B6158]">기초</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">{item.unit}</TableCell>
                    <TableCell className="text-[13px] text-[#6B6158]">{item.category || '-'}</TableCell>
                    <TableCell className="text-[13px] font-data text-right">
                      {formatQty(totalQty, item.unit)}
                    </TableCell>
                    <TableCell>
                      {isLow && (
                        <AlertTriangle className="h-4 w-4 text-[#C4901A]" />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
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
