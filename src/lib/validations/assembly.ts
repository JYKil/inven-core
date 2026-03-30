import { z } from 'zod'

export const assemblyOrderCreateSchema = z.object({
  order_number: z.string().min(1, '조립번호를 입력해주세요'),
  bom_header_id: z.string().uuid('BOM을 선택해주세요'),
  product_item_id: z.string().uuid('결과 품목을 선택해주세요'),
  warehouse_id: z.string().uuid('조립 창고를 선택해주세요'),
  quantity: z.number().positive('수량은 0보다 커야 합니다'),
  assembly_date: z.string().min(1, '조립일을 입력해주세요'),
})

export type AssemblyOrderCreate = z.infer<typeof assemblyOrderCreateSchema>
