'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { formatAmount, formatUnitPrice, formatQty, formatDate } from '@/lib/format'
import { usePurchaseOrders, type PoFilters } from '@/hooks/use-purchase-orders'

export default function PurchaseOrdersContent() {
  const router = useRouter()
  const [filters, setFilters] = useState<PoFilters>({ page: 1, pageSize: 20 })
  const { data, isLoading } = usePurchaseOrders(filters)

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  // PO 데이터를 플랫 행으로 변환
  const flatRows = useMemo(() => {
    if (!data?.data) return []
    const rows: {
      poId: string
      isFirstLine: boolean
      lineCount: number
      orderDate: string
      poNumber: string
      vendorName: string
      itemName: string
      lineType: string
      orderedQty: number
      unitPrice: number
      lineAmount: number
      totalAmount: number
    }[] = []

    for (const po of data.data) {
      const lines = (po as any).purchase_order_lines ?? []
      if (lines.length === 0) {
        // 라인 없는 PO도 표시
        rows.push({
          poId: po.id,
          isFirstLine: true,
          lineCount: 0,
          orderDate: po.order_date,
          poNumber: po.po_number,
          vendorName: (po as any).vendor?.name ?? '-',
          itemName: '-',
          lineType: 'inventory',
          orderedQty: 0,
          unitPrice: 0,
          lineAmount: 0,
          totalAmount: po.total_amount,
        })
      } else {
        lines.forEach((line: any, idx: number) => {
          const isExpense = line.line_type === 'expense'
          rows.push({
            poId: po.id,
            isFirstLine: idx === 0,
            lineCount: lines.length,
            orderDate: po.order_date,
            poNumber: po.po_number,
            vendorName: (po as any).vendor?.name ?? '-',
            itemName: isExpense
              ? (line.description || '-')
              : (line.item?.name ?? '-'),
            lineType: line.line_type ?? 'inventory',
            orderedQty: line.ordered_qty,
            unitPrice: line.unit_price,
            lineAmount: line.line_amount,
            totalAmount: po.total_amount,
          })
        })
      }
    }
    return rows
  }, [data])

  return (
    <div>
      <PageHeader title="발주">
        <Button render={<Link href="/purchase-orders/new" />} className="bg-primary hover:bg-primary-hover">
            <Plus className="h-4 w-4 mr-1" />
            발주 등록
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={filters.search ?? ''}
          onChange={handleSearch}
          placeholder="계약번호·업체명 검색..."
        />
        <Select
          value={filters.status ?? 'all'}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, status: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={{ all: '전체 상태', draft: '임시저장', confirmed: '확정', partially_received: '부분입고', received: '입고완료', cancelled: '취소' }}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="전체 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="confirmed">확정</SelectItem>
            <SelectItem value="partially_received">부분입고</SelectItem>
            <SelectItem value="received">입고완료</SelectItem>
            <SelectItem value="cancelled">취소</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>계약일자</TableHead>
              <TableHead>계약번호</TableHead>
              <TableHead>업체명</TableHead>
              <TableHead>매입품</TableHead>
              <TableHead>구분</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">단가</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead className="text-right">합계</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : flatRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState
                    title="발주가 없습니다"
                    actionLabel="첫 발주 등록하기"
                    actionHref="/purchase-orders/new"
                  />
                </TableCell>
              </TableRow>
            ) : (
              flatRows.map((row, idx) => {
                const isExpense = row.lineType === 'expense'
                return (
                  <TableRow
                    key={`${row.poId}-${idx}`}
                    className={`cursor-pointer hover:bg-background/30 ${row.isFirstLine && idx > 0 ? 'border-t-2 border-border' : ''}`}
                    tabIndex={0}
                    aria-label={`발주 ${row.poNumber} 상세보기`}
                    onClick={() => router.push(`/purchase-orders/${row.poId}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/purchase-orders/${row.poId}`) }}
                  >
                    {/* 그룹 첫 행에만 일자/번호/업체/합계 표시 */}
                    <TableCell className="font-data">
                      {row.isFirstLine ? formatDate(row.orderDate) : ''}
                    </TableCell>
                    <TableCell className="font-data font-medium">
                      {row.isFirstLine ? row.poNumber : ''}
                    </TableCell>
                    <TableCell>
                      {row.isFirstLine ? row.vendorName : ''}
                    </TableCell>
                    <TableCell>{row.itemName}</TableCell>
                    <TableCell>
                      <span className={`inline-block px-2 py-0.5 rounded-sm text-2xs font-medium ${
                        isExpense
                          ? 'bg-warning/10 text-warning'
                          : 'bg-secondary/10 text-secondary'
                      }`}>
                        {isExpense ? '비용' : '재고'}
                      </span>
                    </TableCell>
                    <TableCell className="font-data text-right">
                      {isExpense ? '—' : formatQty(row.orderedQty)}
                    </TableCell>
                    <TableCell className="font-data text-right">
                      {isExpense ? '—' : formatUnitPrice(row.unitPrice)}
                    </TableCell>
                    <TableCell className="font-data text-right">
                      {formatAmount(row.lineAmount)}
                    </TableCell>
                    <TableCell className="font-data text-right font-medium">
                      {row.isFirstLine ? formatAmount(row.totalAmount) : ''}
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
