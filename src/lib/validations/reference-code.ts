import { z } from 'zod'

export const referenceCodeCreateSchema = z.object({
  code_type: z.string().trim().min(1, '타입을 입력해주세요'),
  code_data1: z.string().trim().min(1, '데이터1을 입력해주세요'),
  code_data2: z.string().trim().optional(),
  code_data3: z.string().trim().optional(),
  code_data4: z.string().trim().optional(),
  code_data5: z.string().trim().optional(),
  code_data6: z.string().trim().optional(),
  code_data7: z.string().trim().optional(),
  code_data8: z.string().trim().optional(),
  code_data9: z.string().trim().optional(),
  sort_order: z.number().int().optional(),
})

// 수정 시 code_type 변경 불가
export const referenceCodeUpdateSchema = referenceCodeCreateSchema.omit({ code_type: true })

export type ReferenceCodeCreate = z.infer<typeof referenceCodeCreateSchema>
export type ReferenceCodeUpdate = z.infer<typeof referenceCodeUpdateSchema>
