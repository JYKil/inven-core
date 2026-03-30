import { z } from 'zod'

export const bomLineSchema = z.object({
  material_item_id: z.string().uuid('재료 품목을 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  sort_order: z.number().int().min(0),
})

export const bomHeaderCreateSchema = z.object({
  product_item_id: z.string().uuid('결과 품목을 선택해주세요'),
  version: z.number().int().min(1),
  lines: z.array(bomLineSchema).min(1, '최소 1개의 재료를 추가해주세요'),
})

export type BomLineInput = z.infer<typeof bomLineSchema>
export type BomHeaderCreate = z.infer<typeof bomHeaderCreateSchema>
