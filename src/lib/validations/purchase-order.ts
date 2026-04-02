import { z } from 'zod'

// 재고 라인: 품목 선택 + 수량/단가
const inventoryLineSchema = z.object({
  line_type: z.literal('inventory'),
  item_id: z.string().uuid('품목을 선택해주세요'),
  description: z.string().optional(),
  ordered_qty: z.number().positive('수량은 0보다 커야 합니다'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다'),
  line_amount: z.number().optional(),
})

// 비용 라인: 매입품명 직접 입력 + 금액만
const expenseLineSchema = z.object({
  line_type: z.literal('expense'),
  item_id: z.string().optional(),
  description: z.string().min(1, '매입품명을 입력해주세요'),
  ordered_qty: z.number().optional(),
  unit_price: z.number().optional(),
  line_amount: z.number().positive('금액을 입력해주세요'),
})

export const poLineSchema = z.discriminatedUnion('line_type', [
  inventoryLineSchema,
  expenseLineSchema,
])

export const poCreateSchema = z.object({
  po_number: z.string().min(1, 'PO 번호를 입력해주세요'),
  vendor_id: z.string().uuid('공급업체를 선택해주세요'),
  order_date: z.string().min(1, '발주일을 입력해주세요'),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(poLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
})

export const poUpdateSchema = z.object({
  vendor_id: z.string().uuid().optional(),
  order_date: z.string().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'partially_received', 'received', 'cancelled']).optional(),
})

export type PoLineInput = z.infer<typeof poLineSchema>
export type PoCreate = z.infer<typeof poCreateSchema>
export type PoUpdate = z.infer<typeof poUpdateSchema>
