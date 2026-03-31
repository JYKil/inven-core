'use client'

import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { formatQty, formatAmount, formatDate } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { useInventoryLedger } from '@/hooks/use-reports'
import { useItems } from '@/hooks/use-items'
import { useWarehouses } from '@/hooks/use-warehouses'

// 이번 달 1일 ~ 오늘
function getDefaultDates() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

const txTypeLabels: Record<string, string> = {
  purchase_in: '매입입고',
  purchase_in_cancel: '매입입고 취소',
  goods_receipt: '입고',
  sale_out: '매출출고',
  sale_out_cancel: '매출출고 취소',
  shipment: '출고',
  assembly_in: '조립생산',
  assembly_in_cancel: '조립생산 취소',
  assembly_out: '조립소비',
  assembly_out_cancel: '조립소비 취소',
  assembly_consume: '조립소비',
  assembly_produce: '조립생산',
  transfer_out: '이동출고',
  transfer_out_cancel: '이동출고 취소',
  transfer_in: '이동입고',
  transfer_in_cancel: '이동입고 취소',
}

export default function InventoryLedgerPage() {
  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [itemId, setItemId] = useState<string>()
  const [warehouseId, setWarehouseId] = useState<string>()

  const { data: itemsData } = useItems({ pageSize: 200 })
  const items = itemsData?.data ?? []
  const itemsMap = useMemo(() => {
    const map: Record<string, string> = { all: '전체 품목' }
    items.forEach((i) => { map[i.id] = `${i.code} — ${i.name}` })
    return map
  }, [items])

  const { data: whData } = useWarehouses({ pageSize: 100 })
  const warehouses = whData?.data ?? []
  const whMap = useMemo(() => {
    const map: Record<string, string> = { all: '전체 창고' }
    warehouses.forEach((w) => { map[w.id] = `${w.code} — ${w.name}` })
    return map
  }, [warehouses])

  const { data, isLoading } = useInventoryLedger({
    startDate, endDate, itemId, warehouseId,
  })

  const handleExportCsv = () => {
    if (!data) return
    const headers = ['일자', '품목코드', '품목명', '창고', '유형', '수량', '금액']
    const rows = data.transactions.map((tx) => [
      tx.transaction_date,
      tx.item_code,
      tx.item_name,
      tx.warehouse_name,
      txTypeLabels[tx.transaction_type] ?? tx.transaction_type,
      tx.quantity,
      tx.total_cost,
    ])
    downloadCsv(`수불부_${startDate}_${endDate}`, headers, rows)
  }

  return (
    <div>
      <PageHeader title="재고 수불부">
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.transactions.length === 0}
          onClick={handleExportCsv}
        >
          <Download className="h-4 w-4 mr-1" />
          CSV 내보내기
        </Button>
      </PageHeader>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div className="space-y-1.5">
          <Label className="text-xs">시작일</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">종료일</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">품목</Label>
          <Select
            value={itemId ?? 'all'}
            onValueChange={(v) => setItemId(!v || v === 'all' ? undefined : v)}
            items={itemsMap}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="전체 품목" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 품목</SelectItem>
              {items.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* 요약 */}
      {data && data.summary.length > 0 && (
        <div className="mb-6">
          <h3 className="font-heading font-semibold text-[15px] mb-3">기간 요약</h3>
          <div className="border border-border rounded-[8px] overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-background/50">
                  <TableHead>품목코드</TableHead>
                  <TableHead>품목명</TableHead>
                  <TableHead>창고</TableHead>
                  <TableHead className="text-right">기초 수량</TableHead>
                  <TableHead className="text-right">입고</TableHead>
                  <TableHead className="text-right">출고</TableHead>
                  <TableHead className="text-right">기말 수량</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.summary.map((s, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-data">{s.item_code}</TableCell>
                    <TableCell>{s.item_name}</TableCell>
                    <TableCell>{s.warehouse_name}</TableCell>
                    <TableCell className="font-data text-right">{formatQty(s.opening_qty)}</TableCell>
                    <TableCell className="font-data text-right text-secondary">{formatQty(s.total_in_qty)}</TableCell>
                    <TableCell className="font-data text-right text-destructive">{formatQty(s.total_out_qty)}</TableCell>
                    <TableCell className="font-data text-right font-medium">{formatQty(s.closing_qty)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 거래 내역 */}
      <h3 className="font-heading font-semibold text-[15px] mb-3">거래 내역</h3>
      <div className="border border-border rounded-[8px] overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>일자</TableHead>
              <TableHead>품목코드</TableHead>
              <TableHead>품목명</TableHead>
              <TableHead>창고</TableHead>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">금액</TableHead>
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
            ) : !data || data.transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState title="해당 기간의 거래 내역이 없습니다" />
                </TableCell>
              </TableRow>
            ) : (
              data.transactions.map((tx, idx) => {
                const isIn = tx.quantity > 0
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-data">{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell className="font-data">{tx.item_code}</TableCell>
                    <TableCell>{tx.item_name}</TableCell>
                    <TableCell>{tx.warehouse_name}</TableCell>
                    <TableCell>{txTypeLabels[tx.transaction_type] ?? tx.transaction_type}</TableCell>
                    <TableCell className={`font-data text-right ${isIn ? 'text-secondary' : 'text-destructive'}`}>
                      {isIn ? '+' : ''}{formatQty(tx.quantity)}
                    </TableCell>
                    <TableCell className="font-data text-right">{formatAmount(tx.total_cost)}</TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
