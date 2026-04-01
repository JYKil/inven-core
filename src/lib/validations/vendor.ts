import { z } from 'zod'

export const vendorCreateSchema = z.object({
  name: z.string().min(1, '업체명을 입력해주세요'),
  business_number: z.string().optional(),
  address: z.string().optional(),
  bank_name: z.string().optional(),
  bank_code: z.string().optional(),
  account_number: z.string().optional(),
  account_holder: z.string().optional(),
  payment_currency: z.string().min(1).default('KRW'),
  contact_email: z.string().email('유효한 이메일을 입력해주세요').optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().optional(),
})

export const vendorUpdateSchema = vendorCreateSchema.partial()

export type VendorCreate = z.infer<typeof vendorCreateSchema>
export type VendorUpdate = z.infer<typeof vendorUpdateSchema>
