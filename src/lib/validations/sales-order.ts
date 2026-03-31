import { z } from 'zod'

export const salesOrderLineSchema = z.object({
  item_id: z.string().uuid('품목을 선택해주세요'),
  warehouse_id: z.string().uuid('창고를 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  unit_price: z.number().min(0, '단가는 0 이상이어야 합니다'),
})

export const salesOrderCreateSchema = z.object({
  order_number: z.string().min(1, '주문번호를 입력해주세요'),
  partner_id: z.string().uuid('거래처를 선택해주세요'),
  order_date: z.string().min(1, '주문일을 입력해주세요'),
  notes: z.string().optional(),
  lines: z.array(salesOrderLineSchema).min(1, '최소 1개의 품목을 추가해주세요'),
})

export const salesOrderUpdateSchema = z.object({
  partner_id: z.string().uuid().optional(),
  order_date: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'shipped', 'cancelled']).optional(),
})

export type SalesOrderLineInput = z.infer<typeof salesOrderLineSchema>
export type SalesOrderCreate = z.infer<typeof salesOrderCreateSchema>
export type SalesOrderUpdate = z.infer<typeof salesOrderUpdateSchema>
