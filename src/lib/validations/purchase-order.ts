import { z } from 'zod'

export const poLineSchema = z.object({
  item_id: z.string().uuid('품목을 선택해주세요'),
  ordered_qty: z.number().positive('수량은 0보다 커야 합니다'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다'),
})

export const poCreateSchema = z.object({
  po_number: z.string().min(1, 'PO 번호를 입력해주세요'),
  partner_id: z.string().uuid('공급업체를 선택해주세요'),
  order_date: z.string().min(1, '발주일을 입력해주세요'),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(poLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
})

export const poUpdateSchema = z.object({
  partner_id: z.string().uuid().optional(),
  order_date: z.string().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'partially_received', 'received', 'cancelled']).optional(),
})

export type PoLineInput = z.infer<typeof poLineSchema>
export type PoCreate = z.infer<typeof poCreateSchema>
export type PoUpdate = z.infer<typeof poUpdateSchema>
