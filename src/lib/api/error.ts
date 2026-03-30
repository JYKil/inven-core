// API 에러 클래스 + PostgreSQL 에러 매핑

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR',
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ApiResponse<T> = {
  success: boolean
  data: T | null
  error: { code: string; message: string; details?: unknown } | null
}

export function apiSuccess<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null }
}

export function apiError(code: string, message: string, details?: unknown): ApiResponse<null> {
  return { success: false, data: null, error: { code, message, details } }
}

// PostgreSQL 에러코드 → ApiError 변환
export function mapSupabaseError(error: { code?: string; message: string }): ApiError {
  // RPC에서 RAISE한 에러
  if (error.message.includes('재고 부족')) {
    return new ApiError(409, error.message, 'INSUFFICIENT_STOCK')
  }
  // PostgreSQL 제약조건 에러
  if (error.code === '23505') {
    return new ApiError(409, '중복된 데이터입니다', 'DUPLICATE')
  }
  if (error.code === '23503') {
    return new ApiError(400, '참조하는 데이터가 존재하지 않습니다', 'REFERENCE_ERROR')
  }
  if (error.code === '23514') {
    return new ApiError(400, '데이터 검증 실패', 'VALIDATION_ERROR')
  }
  return new ApiError(500, '서버 오류', 'INTERNAL_ERROR')
}
