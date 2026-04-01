import { describe, it, expect } from 'vitest'
import { vendorCreateSchema } from '@/lib/validations/vendor'
import { customerCreateSchema } from '@/lib/validations/customer'
import { itemCreateSchema } from '@/lib/validations/item'
import { warehouseCreateSchema } from '@/lib/validations/warehouse'
import { poCreateSchema, poLineSchema, poUpdateSchema } from '@/lib/validations/purchase-order'
import { salesOrderCreateSchema, salesOrderLineSchema, salesOrderUpdateSchema } from '@/lib/validations/sales-order'
import { goodsReceiptCreateSchema } from '@/lib/validations/goods-receipt'
import { assemblyOrderCreateSchema } from '@/lib/validations/assembly'
import { bomHeaderCreateSchema, bomLineSchema } from '@/lib/validations/bom'
import { poPaymentCreateSchema } from '@/lib/validations/po-payment'
import { warehouseTransferCreateSchema } from '@/lib/validations/warehouse-transfer'
import { referenceCodeCreateSchema, referenceCodeUpdateSchema } from '@/lib/validations/reference-code'

const uuid = '550e8400-e29b-41d4-a716-446655440000'
const uuid2 = '660e8400-e29b-41d4-a716-446655440000'

// --- 업체 ---
describe('vendorCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = vendorCreateSchema.safeParse({
      name: 'Vendor A',
      payment_currency: 'KRW',
    })
    expect(result.success).toBe(true)
  })

  it('이름 미입력 시 실패', () => {
    const result = vendorCreateSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('빈 이메일은 undefined로 변환', () => {
    const result = vendorCreateSchema.safeParse({
      name: 'Vendor B',
      payment_currency: 'KRW',
      contact_email: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.contact_email).toBeUndefined()
    }
  })

  it('잘못된 이메일 형식 실패', () => {
    const result = vendorCreateSchema.safeParse({
      name: 'Vendor C',
      payment_currency: 'KRW',
      contact_email: 'not-email',
    })
    expect(result.success).toBe(false)
  })

  it('은행/계좌 필드 포함 가능', () => {
    const result = vendorCreateSchema.safeParse({
      name: 'Vendor D',
      bank_name: 'Kookmin',
      account_number: '12345',
      payment_currency: 'USD',
    })
    expect(result.success).toBe(true)
  })
})

// --- 고객 ---
describe('customerCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = customerCreateSchema.safeParse({
      name: 'Amazon',
      receipt_currency: 'USD',
    })
    expect(result.success).toBe(true)
  })

  it('이름 미입력 시 실패', () => {
    const result = customerCreateSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('입금통화 필수', () => {
    const result = customerCreateSchema.safeParse({ name: 'Customer' })
    expect(result.success).toBe(false)
  })

  it('입금통화 빈 문자열 실패', () => {
    const result = customerCreateSchema.safeParse({ name: 'Customer', receipt_currency: '' })
    expect(result.success).toBe(false)
  })

  it('빈 이메일은 undefined로 변환', () => {
    const result = customerCreateSchema.safeParse({
      name: 'Walmart',
      receipt_currency: 'USD',
      contact_email: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.contact_email).toBeUndefined()
    }
  })
})

// --- 품목 ---
describe('itemCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = itemCreateSchema.safeParse({
      code: 'ITEM-001',
      name: '테스트 품목',
      unit: 'EA',
      item_type: 'basic',
      min_stock_qty: 0,
    })
    expect(result.success).toBe(true)
  })

  it('품목코드 미입력 시 실패', () => {
    const result = itemCreateSchema.safeParse({
      code: '',
      name: '품목',
      unit: 'EA',
      item_type: 'basic',
      min_stock_qty: 0,
    })
    expect(result.success).toBe(false)
  })

  it('min_stock_qty 음수 시 실패', () => {
    const result = itemCreateSchema.safeParse({
      code: 'ITEM-001',
      name: '품목',
      unit: 'EA',
      item_type: 'basic',
      min_stock_qty: -1,
    })
    expect(result.success).toBe(false)
  })

  it('잘못된 item_type 실패', () => {
    const result = itemCreateSchema.safeParse({
      code: 'ITEM-001',
      name: '품목',
      unit: 'EA',
      item_type: 'unknown',
      min_stock_qty: 0,
    })
    expect(result.success).toBe(false)
  })
})

// --- 창고 ---
describe('warehouseCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = warehouseCreateSchema.safeParse({
      code: 'WH-01',
      name: '본사 창고',
    })
    expect(result.success).toBe(true)
  })

  it('창고코드 미입력 시 실패', () => {
    const result = warehouseCreateSchema.safeParse({
      code: '',
      name: '창고',
    })
    expect(result.success).toBe(false)
  })
})

// --- 발주서 ---
describe('poCreateSchema', () => {
  const validPo = {
    po_number: 'PO-001',
    vendor_id: uuid,
    order_date: '2026-03-31',
    lines: [{ item_id: uuid, ordered_qty: 10, unit_price: 1000 }],
  }

  it('유효한 데이터 통과', () => {
    expect(poCreateSchema.safeParse(validPo).success).toBe(true)
  })

  it('라인 없으면 실패', () => {
    const result = poCreateSchema.safeParse({ ...validPo, lines: [] })
    expect(result.success).toBe(false)
  })

  it('vendor_id가 UUID가 아니면 실패', () => {
    const result = poCreateSchema.safeParse({ ...validPo, vendor_id: 'not-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('poLineSchema', () => {
  it('수량 0이면 실패', () => {
    const result = poLineSchema.safeParse({ item_id: uuid, ordered_qty: 0, unit_price: 100 })
    expect(result.success).toBe(false)
  })

  it('단가 음수면 실패', () => {
    const result = poLineSchema.safeParse({ item_id: uuid, ordered_qty: 10, unit_price: -1 })
    expect(result.success).toBe(false)
  })
})

// --- 판매주문 ---
describe('salesOrderCreateSchema', () => {
  const validSo = {
    order_number: 'SO-001',
    customer_id: uuid,
    order_date: '2026-03-31',
    lines: [{ item_id: uuid, warehouse_id: uuid2, quantity: 5, unit_price: 2000 }],
  }

  it('유효한 데이터 통과', () => {
    expect(salesOrderCreateSchema.safeParse(validSo).success).toBe(true)
  })

  it('라인 없으면 실패', () => {
    const result = salesOrderCreateSchema.safeParse({ ...validSo, lines: [] })
    expect(result.success).toBe(false)
  })
})

describe('salesOrderLineSchema', () => {
  it('warehouse_id 누락 시 실패', () => {
    const result = salesOrderLineSchema.safeParse({
      item_id: uuid,
      quantity: 5,
      unit_price: 1000,
    })
    expect(result.success).toBe(false)
  })
})

// --- 입고 ---
describe('goodsReceiptCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = goodsReceiptCreateSchema.safeParse({
      receipt_number: 'GR-001',
      warehouse_id: uuid,
      receipt_date: '2026-03-31',
      lines: [{ item_id: uuid, quantity: 10, unit_price: 500 }],
    })
    expect(result.success).toBe(true)
  })

  it('입고번호 미입력 시 실패', () => {
    const result = goodsReceiptCreateSchema.safeParse({
      receipt_number: '',
      warehouse_id: uuid,
      receipt_date: '2026-03-31',
      lines: [{ item_id: uuid, quantity: 10, unit_price: 500 }],
    })
    expect(result.success).toBe(false)
  })
})

// --- 조립 ---
describe('assemblyOrderCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = assemblyOrderCreateSchema.safeParse({
      order_number: 'ASM-001',
      bom_header_id: uuid,
      product_item_id: uuid2,
      warehouse_id: uuid,
      quantity: 10,
      assembly_date: '2026-03-31',
    })
    expect(result.success).toBe(true)
  })

  it('수량 0이면 실패', () => {
    const result = assemblyOrderCreateSchema.safeParse({
      order_number: 'ASM-001',
      bom_header_id: uuid,
      product_item_id: uuid2,
      warehouse_id: uuid,
      quantity: 0,
      assembly_date: '2026-03-31',
    })
    expect(result.success).toBe(false)
  })
})

// --- BOM ---
describe('bomHeaderCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = bomHeaderCreateSchema.safeParse({
      product_item_id: uuid,
      version: 1,
      lines: [{ material_item_id: uuid2, quantity: 2, sort_order: 0 }],
    })
    expect(result.success).toBe(true)
  })

  it('version 0이면 실패', () => {
    const result = bomHeaderCreateSchema.safeParse({
      product_item_id: uuid,
      version: 0,
      lines: [{ material_item_id: uuid2, quantity: 2, sort_order: 0 }],
    })
    expect(result.success).toBe(false)
  })

  it('재료 없으면 실패', () => {
    const result = bomHeaderCreateSchema.safeParse({
      product_item_id: uuid,
      version: 1,
      lines: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('bomLineSchema', () => {
  it('수량 음수면 실패', () => {
    const result = bomLineSchema.safeParse({
      material_item_id: uuid,
      quantity: -1,
      sort_order: 0,
    })
    expect(result.success).toBe(false)
  })
})

// --- 지급 ---
describe('poPaymentCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = poPaymentCreateSchema.safeParse({
      po_id: uuid,
      payment_date: '2026-03-31',
      amount: 50000,
    })
    expect(result.success).toBe(true)
  })

  it('금액 0이면 실패', () => {
    const result = poPaymentCreateSchema.safeParse({
      po_id: uuid,
      payment_date: '2026-03-31',
      amount: 0,
    })
    expect(result.success).toBe(false)
  })
})

// --- 창고이동 ---
describe('warehouseTransferCreateSchema', () => {
  const validTransfer = {
    from_warehouse_id: uuid,
    to_warehouse_id: uuid2,
    transfer_date: '2026-03-31',
    lines: [{ item_id: uuid, quantity: 5 }],
  }

  it('유효한 데이터 통과', () => {
    expect(warehouseTransferCreateSchema.safeParse(validTransfer).success).toBe(true)
  })

  it('출발/도착 창고 동일하면 실패', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      to_warehouse_id: uuid, // 출발 창고와 동일
    })
    expect(result.success).toBe(false)
  })

  it('라인 없으면 실패', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      lines: [],
    })
    expect(result.success).toBe(false)
  })

  it('[I3] 중복 품목이면 실패', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      lines: [
        { item_id: uuid, quantity: 5 },
        { item_id: uuid, quantity: 3 }, // 같은 품목 중복
      ],
    })
    expect(result.success).toBe(false)
  })

  it('[I8] 잘못된 날짜 형식 실패', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      transfer_date: '2026/03/31',
    })
    expect(result.success).toBe(false)
  })

  it('[I8] 유효하지 않은 날짜 실패', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      transfer_date: '2026-13-99',
    })
    expect(result.success).toBe(false)
  })

  it('서로 다른 품목이면 통과', () => {
    const result = warehouseTransferCreateSchema.safeParse({
      ...validTransfer,
      lines: [
        { item_id: uuid, quantity: 5 },
        { item_id: uuid2, quantity: 3 },
      ],
    })
    expect(result.success).toBe(true)
  })
})

// --- 취소(cancel) 상태 스키마 검증 ---
describe('poUpdateSchema — 취소 상태', () => {
  it('status: cancelled 통과', () => {
    const result = poUpdateSchema.safeParse({ status: 'cancelled' })
    expect(result.success).toBe(true)
  })

  it('status: shipped는 유효하지 않은 enum 값이므로 실패', () => {
    const result = poUpdateSchema.safeParse({ status: 'shipped' })
    expect(result.success).toBe(false)
  })

  it('모든 유효 상태값 통과', () => {
    const validStatuses = ['draft', 'confirmed', 'partially_received', 'received', 'cancelled']
    for (const status of validStatuses) {
      expect(poUpdateSchema.safeParse({ status }).success).toBe(true)
    }
  })
})

describe('salesOrderUpdateSchema — 취소 상태', () => {
  it('status: cancelled 통과', () => {
    const result = salesOrderUpdateSchema.safeParse({ status: 'cancelled' })
    expect(result.success).toBe(true)
  })

  it('status: partially_received는 유효하지 않은 enum 값이므로 실패', () => {
    const result = salesOrderUpdateSchema.safeParse({ status: 'partially_received' })
    expect(result.success).toBe(false)
  })

  it('모든 유효 상태값 통과', () => {
    const validStatuses = ['draft', 'confirmed', 'shipped', 'cancelled']
    for (const status of validStatuses) {
      expect(salesOrderUpdateSchema.safeParse({ status }).success).toBe(true)
    }
  })
})

// --- 기준정보 ---
describe('referenceCodeCreateSchema', () => {
  it('유효한 데이터 통과', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '운송수단',
      code_data1: 'DHL Express',
    })
    expect(result.success).toBe(true)
  })

  it('code_type 미입력 시 실패', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '',
      code_data1: 'DHL',
    })
    expect(result.success).toBe(false)
  })

  it('code_data1 미입력 시 실패', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '운송수단',
      code_data1: '',
    })
    expect(result.success).toBe(false)
  })

  it('code_type 공백만 입력 시 trim 후 실패', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '   ',
      code_data1: 'DHL',
    })
    expect(result.success).toBe(false)
  })

  it('code_data1 공백만 입력 시 trim 후 실패', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '운송수단',
      code_data1: '   ',
    })
    expect(result.success).toBe(false)
  })

  it('보조 데이터 2~9 선택 입력 통과', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: 'Shipping Package',
      code_data1: 'Box A',
      code_data2: '30x20x15',
      code_data3: '1.5kg',
      sort_order: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code_data2).toBe('30x20x15')
      expect(result.data.code_data4).toBeUndefined()
    }
  })

  it('sort_order 소수 입력 시 실패', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '운송수단',
      code_data1: 'DHL',
      sort_order: 1.5,
    })
    expect(result.success).toBe(false)
  })

  it('code_type trim 동작 확인', () => {
    const result = referenceCodeCreateSchema.safeParse({
      code_type: '  운송수단  ',
      code_data1: '  DHL Express  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code_type).toBe('운송수단')
      expect(result.data.code_data1).toBe('DHL Express')
    }
  })
})

describe('referenceCodeUpdateSchema', () => {
  it('code_type 필드가 없어야 함', () => {
    const result = referenceCodeUpdateSchema.safeParse({
      code_data1: '수정된 데이터',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect('code_type' in result.data).toBe(false)
    }
  })
})
