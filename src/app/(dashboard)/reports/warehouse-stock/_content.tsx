'use client'

import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/common/page-header'
import { EmptyState } from '@/components/common/empty-state'
import { formatQty, formatAmount, formatUnitPrice } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { useWarehouseStockReport } from '@/hooks/use-reports'
import { useWarehouses } from '@/hooks/use-warehouses'

export default function WarehouseStockContent() {
  const [warehouseId, setWarehouseId] = useState<string>()

  const { data: whData } = useWarehouses({ pageSize: 100 })
  const warehouses = whData?.data ?? []
  const whMap = useMemo(() => {
    const map: Record<string, string> = { all: '전체 창고' }
    warehouses.forEach((w) => { map[w.id] = `${w.code} — ${w.name}` })
    return map
  }, [warehouses])

  const { data, isLoading } = useWarehouseStockReport(warehouseId)

  // 합계 계산
  const totalValue = data?.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0) ?? 0

  const handleExportCsv = () => {
    if (!data) return
    const headers = ['창고코드', '창고명', '품목코드', '품목명', '단위', '수량', '재고가치', '평균단가']
    const rows = data.map((r) => [
      r.warehouse_code, r.warehouse_name,
      r.item_code, r.item_name, r.unit,
      r.total_qty, r.total_value, r.avg_unit_cost,
    ])
    downloadCsv('창고별재고', headers, rows)
  }

  return (
    <div>
      <PageHeader title="창고별 재고">
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.length === 0}
          onClick={handleExportCsv}
        >
          <Download className="h-4 w-4 mr-1" />
          CSV 내보내기
        </Button>
      </PageHeader>

      {/* 필터 */}
      <div className="flex items-end gap-3 mb-6">
        <div className="space-y-1.5">
          <Label className="text-xs">창고</Label>
          <Select
            value={warehouseId ?? 'all'}
            onValueChange={(v) => setWarehouseId(!v || v === 'all' ? undefined : v)}
            items={whMap}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="전체 창고" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 창고</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.code} — {w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 테이블 */}
      <div className="border border-border rounded-[8px] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead className="sticky left-0 z-20 bg-background w-[100px] min-w-[100px]">창고</TableHead>
              <TableHead className="sticky left-[100px] z-20 bg-background w-[100px] min-w-[100px]">품목코드</TableHead>
              <TableHead className="sticky left-[200px] z-20 bg-background min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">품목명</TableHead>
              <TableHead>단위</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">재고가치</TableHead>
              <TableHead className="text-right">평균단가</TableHead>
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
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="재고 데이터가 없습니다" />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="sticky left-0 z-10 bg-card w-[100px] min-w-[100px]">{r.warehouse_name}</TableCell>
                    <TableCell className="font-data sticky left-[100px] z-10 bg-card w-[100px] min-w-[100px]">{r.item_code}</TableCell>
                    <TableCell className="sticky left-[200px] z-10 bg-card min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">{r.item_name}</TableCell>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell className="font-data text-right">{formatQty(r.total_qty, r.unit)}</TableCell>
                    <TableCell className="font-data text-right">{formatAmount(r.total_value)}</TableCell>
                    <TableCell className="font-data text-right">{formatUnitPrice(r.avg_unit_cost)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-background/30">
                  <TableCell colSpan={5} className="text-right text-xs font-medium text-text-secondary">
                    합계
                  </TableCell>
                  <TableCell className="font-data font-medium text-right">
                    {formatAmount(totalValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
