import { z } from 'zod'

export const itemCreateSchema = z.object({
  code: z.string().min(1, '품목코드를 입력해주세요'),
  name: z.string().min(1, '품목명을 입력해주세요'),
  material_type: z.string().optional(),
  unit: z.string().min(1, '단위를 입력해주세요'),
  item_type: z.enum(['basic', 'assembly']),
  description: z.string().optional(),
  min_stock_qty: z.number().min(0, '0 이상이어야 합니다'),
})

export const itemUpdateSchema = itemCreateSchema.partial()

export type ItemCreate = z.infer<typeof itemCreateSchema>
export type ItemUpdate = z.infer<typeof itemUpdateSchema>
