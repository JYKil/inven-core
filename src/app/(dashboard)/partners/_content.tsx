'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { usePartners, type PartnerFilters } from '@/hooks/use-partners'

const partnerTypeLabels: Record<string, string> = {
  supplier: '공급업체',
  customer: '고객',
  both: '공급+고객',
}

export default function PartnersContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<PartnerFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = usePartners(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="거래처">
        <Button render={<Link href="/partners/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            거래처 등록
        </Button>
      </PageHeader>

      {/* 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="업체명, 사업자번호 검색..."
        />
        <Select
          value={filters.partnerType ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, partnerType: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 유형', supplier: '공급업체', customer: '고객', both: '공급+고객' }}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="전체 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="supplier">공급업체</SelectItem>
            <SelectItem value="customer">고객</SelectItem>
            <SelectItem value="both">공급+고객</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 테이블 */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>업체명</TableHead>
              <TableHead>유형</TableHead>
              <TableHead>사업자번호</TableHead>
              <TableHead>담당자</TableHead>
              <TableHead>연락처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState
                    title="거래처가 없습니다"
                    actionLabel="첫 거래처 등록하기"
                    actionHref="/partners/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((partner) => (
                <TableRow
                  key={partner.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  onClick={() => router.push(`/partners/${partner.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/partners/${partner.id}`) }}
                >
                  <TableCell className="font-medium">{partner.name}</TableCell>
                  <TableCell className="text-text-secondary">
                    {partnerTypeLabels[partner.partner_type] ?? partner.partner_type}
                  </TableCell>
                  <TableCell className="font-data text-text-secondary">
                    {partner.business_number || '-'}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {partner.contact_name || '-'}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {partner.phone || '-'}
                  </TableCell>
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
