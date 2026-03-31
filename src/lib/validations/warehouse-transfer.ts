import { z } from 'zod'

export const transferLineSchema = z.object({
  item_id: z.string().uuid('품목을 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
})

// [I8] 날짜 형식 검증 (YYYY-MM-DD)
const dateStringSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)')
  .refine((s) => !isNaN(Date.parse(s)), '유효하지 않은 날짜입니다')

export const warehouseTransferCreateSchema = z.object({
  from_warehouse_id: z.string().uuid('출발 창고를 선택해주세요'),
  to_warehouse_id: z.string().uuid('도착 창고를 선택해주세요'),
  transfer_date: dateStringSchema,
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
}).refine(
  (data) => data.from_warehouse_id !== data.to_warehouse_id,
  { message: '출발 창고와 도착 창고가 동일합니다', path: ['to_warehouse_id'] }
).refine(
  // [I3] 중복 item_id 검증
  (data) => {
    const ids = data.lines.map((l) => l.item_id)
    return new Set(ids).size === ids.length
  },
  { message: '동일 품목이 중복되어 있습니다', path: ['lines'] }
)

export type TransferLineInput = z.infer<typeof transferLineSchema>
export type WarehouseTransferCreate = z.infer<typeof warehouseTransferCreateSchema>
