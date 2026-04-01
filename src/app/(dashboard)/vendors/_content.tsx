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
import { useVendors, type VendorFilters } from '@/hooks/use-vendors'

export default function VendorsContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<VendorFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = useVendors(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  return (
    <div>
      <PageHeader title="업체정보">
        <Button render={<Link href="/vendors/new" />} className="bg-primary hover:bg-primary-hover">
          <Plus className="h-4 w-4 mr-1" />
          업체 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="업체명, 사업자번호 검색..."
        />
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>업체명</TableHead>
              <TableHead>사업자번호</TableHead>
              <TableHead>은행</TableHead>
              <TableHead>계좌번호</TableHead>
              <TableHead>지급통화</TableHead>
              <TableHead>이메일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    title="등록된 업체가 없습니다"
                    actionLabel="첫 업체 등록하기"
                    actionHref="/vendors/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((vendor) => (
                <TableRow
                  key={vendor.id}
                  className="cursor-pointer hover:bg-background/30"
                  tabIndex={0}
                  aria-label={`업체 ${vendor.name} 상세보기`}
                  onClick={() => router.push(`/vendors/${vendor.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/vendors/${vendor.id}`) }}
                >
                  <TableCell className="font-medium">{vendor.name}</TableCell>
                  <TableCell className="font-data text-text-secondary">
                    {vendor.business_number || '-'}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {vendor.bank_name || '-'}
                  </TableCell>
                  <TableCell className="font-data text-text-secondary">
                    {vendor.account_number || '-'}
                  </TableCell>
                  <TableCell className="font-data text-text-secondary">
                    {vendor.payment_currency}
                  </TableCell>
                  <TableCell className="text-text-secondary">
                    {vendor.contact_email || '-'}
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
