'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/page-header'
import { SearchInput } from '@/components/common/search-input'
import { EmptyState } from '@/components/common/empty-state'
import { DataTablePagination } from '@/components/common/data-table-pagination'
import { formatQty, formatAmount, formatDate, formatUnitPrice } from '@/lib/format'
import { useInventorySummary, useInventoryLots, type InventoryFilters } from '@/hooks/use-inventory'
import { useWarehouses } from '@/hooks/use-warehouses'

export default function InventoryPage() {
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1, pageSize: 50, view: 'item',
  })
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [selectedItemUnit, setSelectedItemUnit] = useState('EA')

  const { data, isLoading } = useInventorySummary(filters)
  const { data: warehousesData } = useWarehouses({ pageSize: 100 })
  const warehouses = warehousesData?.data ?? []

  const warehouseItems = useMemo(() => {
    const map: Record<string, string> = { all: '전체 창고' }
    warehouses.forEach((wh) => { map[wh.id] = `${wh.code} — ${wh.name}` })
    return map
  }, [warehouses])

  const handleSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search, page: 1 }))
  }, [])

  // 품목별 집계 (같은 item_id 합산)
  const itemAggregated = data?.data ? aggregateByItem(data.data) : []

  return (
    <div>
      <PageHeader title="재고 현황" />

      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-[6px] border border-border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-xs font-medium ${filters.view === 'item' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background'}`}
            onClick={() => setFilters((p) => ({ ...p, view: 'item' }))}
          >
            품목별
          </button>
          <button
            className={`px-3 py-1.5 text-xs font-medium ${filters.view === 'warehouse' ? 'bg-primary text-white' : 'text-text-secondary hover:bg-background'}`}
            onClick={() => setFilters((p) => ({ ...p, view: 'warehouse' }))}
          >
            창고별
          </button>
        </div>
        <Select
          value={filters.warehouseId ?? 'all'}
          onValueChange={(v) => setFilters((p) => ({ ...p, warehouseId: !v || v === 'all' ? undefined : v, page: 1 }))}
          items={warehouseItems}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="전체 창고" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 창고</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>{wh.code} — {wh.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 메인 테이블 */}
      <div className="border border-border rounded-[8px] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              {filters.view === 'warehouse' && (
                <TableHead>창고</TableHead>
              )}
              <TableHead>코드</TableHead>
              <TableHead>품목명</TableHead>
              <TableHead className="text-right">총 재고량</TableHead>
              <TableHead className="text-right">총 재고가치</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: filters.view === 'warehouse' ? 6 : 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filters.view === 'item' ? (
              itemAggregated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState title="재고가 없습니다" description="입고 처리 후 재고가 표시됩니다" />
                  </TableCell>
                </TableRow>
              ) : (
                itemAggregated.map((row: any) => {
                  const isLow = row.min_stock_qty > 0 && row.totalQty < row.min_stock_qty
                  return (
                    <TableRow
                      key={row.item_id}
                      className="cursor-pointer hover:bg-background/30"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedItemId(selectedItemId === row.item_id ? null : row.item_id)
                        setSelectedItemUnit(row.unit ?? 'EA')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedItemId(selectedItemId === row.item_id ? null : row.item_id)
                          setSelectedItemUnit(row.unit ?? 'EA')
                        }
                      }}
                    >
                      <TableCell className="font-data font-medium">{row.code}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="font-data text-right">
                        {formatQty(row.totalQty, row.unit)}
                      </TableCell>
                      <TableCell className="font-data text-right">
                        {formatAmount(row.totalValue)}
                      </TableCell>
                      <TableCell>
                        {isLow && <AlertTriangle className="h-4 w-4 text-warning" />}
                      </TableCell>
                    </TableRow>
                  )
                })
              )
            ) : (
              // 창고별 뷰: 원본 데이터 그대로
              data?.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <EmptyState title="재고가 없습니다" />
                  </TableCell>
                </TableRow>
              ) : (
                data?.data.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.warehouse?.name}</TableCell>
                    <TableCell className="font-data">{row.item?.code}</TableCell>
                    <TableCell>{row.item?.name}</TableCell>
                    <TableCell className="font-data text-right">
                      {formatQty(row.total_qty, row.item?.unit)}
                    </TableCell>
                    <TableCell className="font-data text-right">
                      {formatAmount(row.total_value)}
                    </TableCell>
                    <TableCell>
                      {row.item?.min_stock_qty > 0 && row.total_qty < row.item.min_stock_qty && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )
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

      {/* 로트 드릴다운 */}
      {selectedItemId && (
        <LotDrilldown itemId={selectedItemId} unit={selectedItemUnit} />
      )}
    </div>
  )
}

// 품목별 집계 함수
function aggregateByItem(data: any[]): any[] {
  const map = new Map<string, any>()
  for (const row of data) {
    const key = row.item_id
    if (!map.has(key)) {
      map.set(key, {
        item_id: key,
        code: row.item?.code,
        name: row.item?.name,
        unit: row.item?.unit,
        min_stock_qty: row.item?.min_stock_qty ?? 0,
        totalQty: 0,
        totalValue: 0,
      })
    }
    const entry = map.get(key)!
    entry.totalQty += row.total_qty
    entry.totalValue += row.total_value
  }
  return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
}

// 로트 드릴다운 컴포넌트
function LotDrilldown({ itemId, unit }: { itemId: string; unit: string }) {
  const { data: lots, isLoading } = useInventoryLots(itemId)

  if (isLoading) return <Skeleton className="h-40 w-full mt-4" />

  return (
    <Card className="border-border mt-4">
      <CardContent className="pt-4">
        <h3 className="font-heading font-semibold text-[15px] mb-3">로트 상세</h3>
        {!lots || lots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">로트가 없습니다</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-background/50">
                <TableHead>창고</TableHead>
                <TableHead>입고일</TableHead>
                <TableHead>출처</TableHead>
                <TableHead className="text-right">초기수량</TableHead>
                <TableHead className="text-right">잔여수량</TableHead>
                <TableHead className="text-right">단가</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot: any) => (
                <TableRow key={lot.id} className="h-8">
                  <TableCell>{lot.warehouse?.name}</TableCell>
                  <TableCell className="font-data">{formatDate(lot.lot_date)}</TableCell>
                  <TableCell className="text-text-secondary">{lot.source_type}</TableCell>
                  <TableCell className="font-data text-right">{formatQty(lot.initial_qty, unit)}</TableCell>
                  <TableCell className="font-data text-right">{formatQty(lot.remaining_qty, unit)}</TableCell>
                  <TableCell className="font-data text-right">{formatUnitPrice(lot.unit_cost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
