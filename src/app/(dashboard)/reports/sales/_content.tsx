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
import { formatAmount, formatQty, formatPercent, formatDate } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { useSalesReport } from '@/hooks/use-reports'
import { usePartners } from '@/hooks/use-partners'

function getDefaultDates() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function SalesReportContent() {
  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [partnerId, setPartnerId] = useState<string>()

  // 고객 거래처 (customer + both)
  const { data: custData } = usePartners({ partnerType: 'customer', pageSize: 100 })
  const { data: bothData } = usePartners({ partnerType: 'both', pageSize: 100 })
  const partners = [...(custData?.data ?? []), ...(bothData?.data ?? [])]
  const partnerMap = useMemo(() => {
    const map: Record<string, string> = { all: '전체 거래처' }
    partners.forEach((p) => { map[p.id] = p.name })
    return map
  }, [partners])

  const { data, isLoading } = useSalesReport({ startDate, endDate, partnerId })

  const handleExportCsv = () => {
    if (!data) return
    const headers = ['주문번호', '주문일', '거래처', '품목코드', '품목명', '수량', '단가', '매출액', '원가', '이익']
    const rows = data.lines.map((l) => [
      l.order_number, l.order_date, l.partner_name,
      l.item_code, l.item_name, l.quantity, l.unit_price,
      l.line_amount, l.cost_of_goods, l.gross_profit,
    ])
    downloadCsv(`매출보고서_${startDate}_${endDate}`, headers, rows)
  }

  return (
    <div>
      <PageHeader title="매출 보고서">
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.lines.length === 0}
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
          <Label className="text-xs">거래처</Label>
          <Select
            value={partnerId ?? 'all'}
            onValueChange={(v) => setPartnerId(!v || v === 'all' ? undefined : v)}
            items={partnerMap}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="전체 거래처" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 거래처</SelectItem>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 요약 — 테이블 행 (카드 대신, DESIGN.md 원칙: 카드는 인터랙션일 때만) */}
      {data && data.totals && (
        <div className="border border-border rounded-lg overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">매출액</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">매출원가</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">매출이익</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">이익률</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-data text-lg font-bold">{formatAmount(data.totals.total_revenue)}</td>
                <td className="px-4 py-3 font-data text-lg font-bold">{formatAmount(data.totals.total_cogs)}</td>
                <td className={`px-4 py-3 font-data text-lg font-bold ${data.totals.total_profit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                  {formatAmount(data.totals.total_profit)}
                </td>
                <td className="px-4 py-3 font-data text-lg font-bold">{formatPercent(data.profit_margin)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 라인 테이블 */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-background/50">
              <TableHead>주문번호</TableHead>
              <TableHead>주문일</TableHead>
              <TableHead>거래처</TableHead>
              <TableHead>품목</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">매출액</TableHead>
              <TableHead className="text-right">원가</TableHead>
              <TableHead className="text-right">이익</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !data || data.lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState title="해당 기간의 매출 데이터가 없습니다" />
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.lines.map((l, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-data">{l.order_number}</TableCell>
                    <TableCell className="font-data">{formatDate(l.order_date)}</TableCell>
                    <TableCell>{l.partner_name}</TableCell>
                    <TableCell>{l.item_code} — {l.item_name}</TableCell>
                    <TableCell className="font-data text-right">{formatQty(l.quantity, l.unit)}</TableCell>
                    <TableCell className="font-data text-right">{formatAmount(l.line_amount)}</TableCell>
                    <TableCell className="font-data text-right">{formatAmount(l.cost_of_goods)}</TableCell>
                    <TableCell className={`font-data text-right ${l.gross_profit >= 0 ? 'text-secondary' : 'text-destructive'}`}>
                      {formatAmount(l.gross_profit)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-background/30">
                  <TableCell colSpan={5} className="text-right text-xs font-medium text-text-secondary">
                    합계
                  </TableCell>
                  <TableCell className="font-data font-medium text-right">
                    {formatAmount(data.totals.total_revenue)}
                  </TableCell>
                  <TableCell className="font-data font-medium text-right">
                    {formatAmount(data.totals.total_cogs)}
                  </TableCell>
                  <TableCell className="font-data font-medium text-right">
                    {formatAmount(data.totals.total_profit)}
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

