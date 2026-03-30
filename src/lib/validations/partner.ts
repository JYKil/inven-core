import { z } from 'zod'

export const partnerCreateSchema = z.object({
  name: z.string().min(1, '업체명을 입력해주세요'),
  partner_type: z.enum(['supplier', 'customer', 'both']),
  business_number: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('유효한 이메일을 입력해주세요').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const partnerUpdateSchema = partnerCreateSchema.partial()

export type PartnerCreate = z.infer<typeof partnerCreateSchema>
export type PartnerUpdate = z.infer<typeof partnerUpdateSchema>
