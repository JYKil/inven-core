import { z } from 'zod'

export const transferLineSchema = z.object({
  item_id: z.string().uuid('품목을 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
})

export const warehouseTransferCreateSchema = z.object({
  from_warehouse_id: z.string().uuid('출발 창고를 선택해주세요'),
  to_warehouse_id: z.string().uuid('도착 창고를 선택해주세요'),
  transfer_date: z.string().min(1, '이동일을 입력해주세요'),
  notes: z.string().optional(),
  lines: z.array(transferLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
}).refine(
  (data) => data.from_warehouse_id !== data.to_warehouse_id,
  { message: '출발 창고와 도착 창고가 동일합니다', path: ['to_warehouse_id'] }
)

export type TransferLineInput = z.infer<typeof transferLineSchema>
export type WarehouseTransferCreate = z.infer<typeof warehouseTransferCreateSchema>
