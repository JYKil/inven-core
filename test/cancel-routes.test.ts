import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- mock 설정 ---

// NextResponse.json mock
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

// Supabase 서버 클라이언트 mock
const mockRpc = vi.fn()
const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { company_id: 'comp-1', role: 'normal' },
          error: null,
        }),
      }),
    }),
  }),
  rpc: mockRpc,
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue(mockSupabase),
}))

// --- 헬퍼 ---

function fakeRequest(url: string, body?: Record<string, unknown>): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}',
  })
}

// --- 출고 취소 (cancel_shipment) ---
describe('POST /api/sales-orders/[id]/cancel-shipment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: rpc 성공
    mockRpc.mockResolvedValue({ data: { status: 'confirmed' }, error: null })
    // auth mock 재설정
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { company_id: 'comp-1', role: 'normal' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('성공 시 rpc를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest(
      'http://localhost/api/sales-orders/so-uuid-123/cancel-shipment',
      { reason: '고객 변심' }
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('cancel_shipment', {
      p_sales_order_id: 'so-uuid-123',
      p_company_id: 'comp-1',
      p_reason: '고객 변심',
    })
  })

  it('사유 없이 호출 시 reason은 null', async () => {
    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest(
      'http://localhost/api/sales-orders/so-uuid-456/cancel-shipment'
    )

    await POST(req)
    expect(mockRpc).toHaveBeenCalledWith('cancel_shipment', {
      p_sales_order_id: 'so-uuid-456',
      p_company_id: 'comp-1',
      p_reason: null,
    })
  })

  it('rpc 에러 시 에러 응답 반환', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: '재고 부족: 사과 (필요 10, 가용 5)' },
    })

    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest(
      'http://localhost/api/sales-orders/so-uuid-789/cancel-shipment'
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('인증 실패 시 401 반환', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid token' },
    })

    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest(
      'http://localhost/api/sales-orders/so-uuid-000/cancel-shipment'
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})

// --- 입고 취소 (cancel_goods_receipt) ---
describe('POST /api/goods-receipts/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: { status: 'cancelled' }, error: null })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { company_id: 'comp-1', role: 'normal' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('성공 시 rpc를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/goods-receipts/[id]/cancel/route')
    const req = fakeRequest(
      'http://localhost/api/goods-receipts/gr-uuid-123/cancel',
      { reason: '입고 오류' }
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('cancel_goods_receipt', {
      p_goods_receipt_id: 'gr-uuid-123',
      p_company_id: 'comp-1',
      p_reason: '입고 오류',
    })
  })

  it('rpc 에러(재고 부족) 시 409 반환', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: '재고 부족: 볼트 (필요 100, 가용 30)' },
    })

    const { POST } = await import('@/app/api/goods-receipts/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/goods-receipts/gr-uuid-456/cancel')

    const res = (await POST(req)) as any
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })
})

// --- 창고이동 취소 (cancel_transfer) ---
describe('POST /api/warehouse-transfers/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: { status: 'cancelled' }, error: null })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { company_id: 'comp-1', role: 'normal' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('성공 시 rpc를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/warehouse-transfers/[id]/cancel/route')
    const req = fakeRequest(
      'http://localhost/api/warehouse-transfers/wt-uuid-123/cancel',
      { reason: '이동 오류' }
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('cancel_transfer', {
      p_warehouse_transfer_id: 'wt-uuid-123',
      p_company_id: 'comp-1',
      p_reason: '이동 오류',
    })
  })

  it('사유 없이 호출 시 reason은 null', async () => {
    const { POST } = await import('@/app/api/warehouse-transfers/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/warehouse-transfers/wt-uuid-456/cancel')

    await POST(req)
    expect(mockRpc).toHaveBeenCalledWith('cancel_transfer', {
      p_warehouse_transfer_id: 'wt-uuid-456',
      p_company_id: 'comp-1',
      p_reason: null,
    })
  })
})

// --- 조립 취소 (cancel_assembly) ---
describe('POST /api/assembly-orders/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: { status: 'cancelled' }, error: null })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { company_id: 'comp-1', role: 'normal' },
            error: null,
          }),
        }),
      }),
    })
  })

  it('성공 시 rpc를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const req = fakeRequest(
      'http://localhost/api/assembly-orders/asm-uuid-123/cancel',
      { reason: '조립 실패' }
    )

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('cancel_assembly', {
      p_assembly_order_id: 'asm-uuid-123',
      p_company_id: 'comp-1',
      p_reason: '조립 실패',
    })
  })

  it('프로필 없음 시 403 반환', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/assembly-orders/asm-uuid-456/cancel')

    const res = (await POST(req)) as any
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('일반 서버 에러 시 500 반환', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'unexpected database error' },
    })

    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/assembly-orders/asm-uuid-789/cancel')

    const res = (await POST(req)) as any
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
