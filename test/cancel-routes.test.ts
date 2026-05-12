import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiError } from '@/lib/api/error'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

const mockGetSessionProfile = vi.fn()
const mockCallRpc = vi.fn()

vi.mock('@/lib/api/session', () => ({
  getSessionProfile: mockGetSessionProfile,
}))

vi.mock('@/lib/db/rpc', () => ({
  callRpc: mockCallRpc,
}))

function fakeRequest(url: string, body?: Record<string, unknown>): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSessionProfile.mockResolvedValue({
    id: 'user-1',
    email: 'user@example.com',
    display_name: 'User',
    company_id: 'comp-1',
    role: 'normal',
    is_active: true,
  })
  mockCallRpc.mockResolvedValue({ status: 'ok' })
})

describe('POST /api/sales-orders/[id]/cancel-shipment', () => {
  it('성공 시 PostgreSQL 함수를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest('http://localhost/api/sales-orders/so-uuid-123/cancel-shipment', { reason: '고객 변심' })

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_shipment($1::uuid, $2::uuid, $3::text) AS result',
      ['so-uuid-123', 'comp-1', '고객 변심'],
    )
  })

  it('사유 없이 호출 시 reason은 null', async () => {
    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const req = fakeRequest('http://localhost/api/sales-orders/so-uuid-456/cancel-shipment')

    await POST(req)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_shipment($1::uuid, $2::uuid, $3::text) AS result',
      ['so-uuid-456', 'comp-1', null],
    )
  })

  it('DB 에러 시 매핑된 에러 응답 반환', async () => {
    mockCallRpc.mockRejectedValue(new ApiError(409, '재고 부족: 사과 (필요 10, 가용 5)', 'INSUFFICIENT_STOCK'))

    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const res = (await POST(fakeRequest('http://localhost/api/sales-orders/so-uuid-789/cancel-shipment'))) as any

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })

  it('인증 실패 시 401 반환', async () => {
    mockGetSessionProfile.mockRejectedValue(new ApiError(401, '인증이 필요합니다', 'UNAUTHORIZED'))

    const { POST } = await import('@/app/api/sales-orders/[id]/cancel-shipment/route')
    const res = (await POST(fakeRequest('http://localhost/api/sales-orders/so-uuid-000/cancel-shipment'))) as any

    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHORIZED')
  })
})

describe('POST /api/goods-receipts/[id]/cancel', () => {
  it('성공 시 PostgreSQL 함수를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/goods-receipts/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/goods-receipts/gr-uuid-123/cancel', { reason: '입고 오류' })

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_goods_receipt($1::uuid, $2::uuid, $3::text) AS result',
      ['gr-uuid-123', 'comp-1', '입고 오류'],
    )
  })

  it('DB 에러 시 409 반환', async () => {
    mockCallRpc.mockRejectedValue(new ApiError(409, '재고 부족: 볼트 (필요 100, 가용 30)', 'INSUFFICIENT_STOCK'))

    const { POST } = await import('@/app/api/goods-receipts/[id]/cancel/route')
    const res = (await POST(fakeRequest('http://localhost/api/goods-receipts/gr-uuid-456/cancel'))) as any

    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
  })
})

describe('POST /api/warehouse-transfers/[id]/cancel', () => {
  it('성공 시 PostgreSQL 함수를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/warehouse-transfers/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/warehouse-transfers/wt-uuid-123/cancel', { reason: '이동 오류' })

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_transfer($1::uuid, $2::uuid, $3::text) AS result',
      ['wt-uuid-123', 'comp-1', '이동 오류'],
    )
  })

  it('사유 없이 호출 시 reason은 null', async () => {
    const { POST } = await import('@/app/api/warehouse-transfers/[id]/cancel/route')

    await POST(fakeRequest('http://localhost/api/warehouse-transfers/wt-uuid-456/cancel'))
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_transfer($1::uuid, $2::uuid, $3::text) AS result',
      ['wt-uuid-456', 'comp-1', null],
    )
  })
})

describe('POST /api/assembly-orders/[id]/cancel', () => {
  it('성공 시 PostgreSQL 함수를 올바른 파라미터로 호출', async () => {
    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const req = fakeRequest('http://localhost/api/assembly-orders/asm-uuid-123/cancel', { reason: '조립 실패' })

    const res = (await POST(req)) as any
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'SELECT cancel_assembly($1::uuid, $2::uuid, $3::text) AS result',
      ['asm-uuid-123', 'comp-1', '조립 실패'],
    )
  })

  it('프로필 조회 실패 시 403 반환', async () => {
    mockGetSessionProfile.mockRejectedValue(new ApiError(403, '프로필을 찾을 수 없습니다', 'FORBIDDEN'))

    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const res = (await POST(fakeRequest('http://localhost/api/assembly-orders/asm-uuid-456/cancel'))) as any

    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  it('일반 서버 에러 시 500 반환', async () => {
    mockCallRpc.mockRejectedValue(new Error('unexpected database error'))

    const { POST } = await import('@/app/api/assembly-orders/[id]/cancel/route')
    const res = (await POST(fakeRequest('http://localhost/api/assembly-orders/asm-uuid-789/cancel'))) as any

    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
