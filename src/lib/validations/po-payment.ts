import { z } from 'zod'

export const poPaymentCreateSchema = z.object({
  po_id: z.string().uuid('발주서를 선택해주세요'),
  payment_date: z.string().min(1, '지급일을 입력해주세요'),
  amount: z.number().positive('금액은 0보다 커야 합니다'),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

export type PoPaymentCreate = z.infer<typeof poPaymentCreateSchema>
