import { z } from 'zod'

export const warehouseCreateSchema = z.object({
  name: z.string().min(1, '창고명을 입력해주세요'),
  address: z.string().optional(),
  contact: z.string().optional(),
  notes: z.string().optional(),
})

export const warehouseUpdateSchema = warehouseCreateSchema.partial()

export type WarehouseCreate = z.infer<typeof warehouseCreateSchema>
export type WarehouseUpdate = z.infer<typeof warehouseUpdateSchema>
