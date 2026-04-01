import { z } from 'zod'

export const customerCreateSchema = z.object({
  name: z.string().min(1, '고객사명을 입력해주세요'),
  business_number: z.string().optional(),
  address: z.string().optional(),
  receipt_currency: z.string().min(1, '입금통화를 입력해주세요'),
  contact_email: z.string().email('유효한 이메일을 입력해주세요').optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().optional(),
})

export const customerUpdateSchema = customerCreateSchema.partial()

export type CustomerCreate = z.infer<typeof customerCreateSchema>
export type CustomerUpdate = z.infer<typeof customerUpdateSchema>
