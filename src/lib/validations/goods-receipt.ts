import { z } from 'zod'

export const grLineSchema = z.object({
  po_line_id: z.string().uuid().optional(),
  item_id: z.string().uuid('품목을 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다'),
})

export const goodsReceiptCreateSchema = z.object({
  receipt_number: z.string().min(1, '입고번호를 입력해주세요'),
  po_id: z.string().uuid().optional(),
  warehouse_id: z.string().uuid('입고 창고를 선택해주세요'),
  receipt_date: z.string().min(1, '입고일을 입력해주세요'),
  notes: z.string().optional(),
  lines: z.array(grLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
})

export type GrLineInput = z.infer<typeof grLineSchema>
export type GoodsReceiptCreate = z.infer<typeof goodsReceiptCreateSchema>
