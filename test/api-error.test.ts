import { describe, it, expect } from 'vitest'
import { ApiError, extractErrorMessage, mapSupabaseError, apiSuccess, apiError } from '@/lib/api/error'

describe('ApiError', () => {
  it('statusCode, message, code를 가진다', () => {
    const err = new ApiError(404, '찾을 수 없습니다', 'NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('찾을 수 없습니다')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })

  it('details 없이 생성 가능', () => {
    const err = new ApiError(500, '서버 오류')
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.details).toBeUndefined()
  })

  it('details와 함께 생성 가능', () => {
    const err = new ApiError(400, '검증 실패', 'VALIDATION', { field: 'name' })
    expect(err.details).toEqual({ field: 'name' })
  })
})

describe('extractErrorMessage', () => {
  it('Error 인스턴스에서 message 추출', () => {
    expect(extractErrorMessage(new Error('테스트 에러'))).toBe('테스트 에러')
  })

  it('ApiError에서 message 추출', () => {
    expect(extractErrorMessage(new ApiError(400, 'API 에러'))).toBe('API 에러')
  })

  it('message 속성이 있는 객체에서 추출', () => {
    expect(extractErrorMessage({ message: '커스텀 에러' })).toBe('커스텀 에러')
  })

  it('PostgreSQL 23505 (중복) 에러코드 변환', () => {
    expect(extractErrorMessage({ code: '23505', message: 'duplicate key' }))
      .toBe('이미 존재하는 데이터입니다')
  })

  it('PostgreSQL 23503 (참조) 에러코드 변환', () => {
    expect(extractErrorMessage({ code: '23503', message: 'foreign key violation' }))
      .toBe('참조하는 데이터가 존재하지 않습니다')
  })

  it('PostgreSQL 23514 (체크) 에러코드 변환', () => {
    expect(extractErrorMessage({ code: '23514', message: 'check constraint' }))
      .toBe('데이터 검증에 실패했습니다')
  })

  it('null이면 기본 메시지 반환', () => {
    expect(extractErrorMessage(null)).toBe('오류가 발생했습니다')
  })

  it('undefined이면 기본 메시지 반환', () => {
    expect(extractErrorMessage(undefined)).toBe('오류가 발생했습니다')
  })

  it('커스텀 기본 메시지 사용', () => {
    expect(extractErrorMessage(null, '실패했습니다')).toBe('실패했습니다')
  })

  it('문자열이면 기본 메시지 반환', () => {
    expect(extractErrorMessage('string error')).toBe('오류가 발생했습니다')
  })
})

describe('mapSupabaseError', () => {
  it('재고 부족 메시지 → INSUFFICIENT_STOCK', () => {
    const result = mapSupabaseError({ message: '재고 부족: 사과 (필요 100, 가용 50)' })
    expect(result.statusCode).toBe(409)
    expect(result.code).toBe('INSUFFICIENT_STOCK')
  })

  it('23505 → DUPLICATE (409)', () => {
    const result = mapSupabaseError({ code: '23505', message: 'unique violation' })
    expect(result.statusCode).toBe(409)
    expect(result.code).toBe('DUPLICATE')
  })

  it('23503 → REFERENCE_ERROR (400)', () => {
    const result = mapSupabaseError({ code: '23503', message: 'foreign key violation' })
    expect(result.statusCode).toBe(400)
    expect(result.code).toBe('REFERENCE_ERROR')
  })

  it('23514 → VALIDATION_ERROR (400)', () => {
    const result = mapSupabaseError({ code: '23514', message: 'check constraint' })
    expect(result.statusCode).toBe(400)
    expect(result.code).toBe('VALIDATION_ERROR')
  })

  it('알 수 없는 에러 → INTERNAL_ERROR (500)', () => {
    const result = mapSupabaseError({ message: 'something went wrong' })
    expect(result.statusCode).toBe(500)
    expect(result.code).toBe('INTERNAL_ERROR')
  })
})

describe('apiSuccess / apiError', () => {
  it('apiSuccess는 success: true 구조를 반환', () => {
    const result = apiSuccess({ id: '123' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: '123' })
    expect(result.error).toBeNull()
  })

  it('apiError는 success: false 구조를 반환', () => {
    const result = apiError('NOT_FOUND', '찾을 수 없습니다')
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toEqual({ code: 'NOT_FOUND', message: '찾을 수 없습니다' })
  })

  it('apiError에 details 포함 가능', () => {
    const result = apiError('VALIDATION', '실패', [{ field: 'name' }])
    expect(result.error?.details).toEqual([{ field: 'name' }])
  })
})
