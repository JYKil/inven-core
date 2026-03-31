import { describe, it, expect, vi } from 'vitest'
import { withApiHandler } from '@/lib/api/handler'
import { ApiError } from '@/lib/api/error'
import { ZodError, z } from 'zod'

// NextResponse.json mock
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

function fakeRequest(): Request {
  return new Request('http://localhost/api/test', { method: 'POST' })
}

describe('withApiHandler', () => {
  it('성공 시 핸들러 응답을 그대로 반환', async () => {
    const handler = withApiHandler(async () => {
      const { NextResponse } = await import('next/server')
      return NextResponse.json({ success: true, data: 'ok', error: null })
    })

    const res = (await handler(fakeRequest())) as any
    expect(res.body.success).toBe(true)
    expect(res.body.data).toBe('ok')
  })

  it('ApiError → 해당 statusCode + 에러 응답', async () => {
    const handler = withApiHandler(async () => {
      throw new ApiError(409, '중복된 데이터', 'DUPLICATE')
    })

    const res = (await handler(fakeRequest())) as any
    expect(res.status).toBe(409)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('DUPLICATE')
    expect(res.body.error.message).toBe('중복된 데이터')
  })

  it('ApiError details 포함', async () => {
    const handler = withApiHandler(async () => {
      throw new ApiError(400, '검증 실패', 'VALIDATION', { field: 'name' })
    })

    const res = (await handler(fakeRequest())) as any
    expect(res.status).toBe(400)
    expect(res.body.error.details).toEqual({ field: 'name' })
  })

  it('ZodError → 400 VALIDATION_ERROR', async () => {
    const schema = z.object({ name: z.string().min(1) })
    const handler = withApiHandler(async () => {
      schema.parse({ name: '' })
      throw new Error('unreachable')
    })

    const res = (await handler(fakeRequest())) as any
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.message).toBe('입력값 검증 실패')
    expect(Array.isArray(res.body.error.details)).toBe(true)
  })

  it('예상치 못한 에러 → 500 INTERNAL_ERROR', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = withApiHandler(async () => {
      throw new TypeError('unexpected')
    })

    const res = (await handler(fakeRequest())) as any
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
    expect(res.body.error.message).toBe('서버 오류가 발생했습니다')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
