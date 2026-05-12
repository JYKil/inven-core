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
export function mapPostgresError(error: { code?: string; message: string }): ApiError {
  // RPC에서 RAISE한 에러 — 메시지 패턴 매칭
  if (error.message.includes('재고 부족')) {
    return new ApiError(409, error.message, 'INSUFFICIENT_STOCK')
  }
  if (error.message.includes('권한이 없습니다')) {
    return new ApiError(403, error.message, 'FORBIDDEN')
  }
  if (error.message.includes('찾을 수 없습니다')) {
    return new ApiError(404, error.message, 'NOT_FOUND')
  }
  if (error.message.includes('초과') || error.message.includes('0보다 커야')) {
    return new ApiError(400, error.message, 'VALIDATION_ERROR')
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
  return new ApiError(500, error.message || '서버 오류', 'INTERNAL_ERROR')
}

export const mapDbError = mapPostgresError

// 클라이언트 catch 블록에서 사용 — API/DB 에러 메시지 처리
export function extractErrorMessage(err: unknown, fallback = '오류가 발생했습니다'): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) {
    const e = err as { code?: string; message: string }
    // PostgreSQL 제약조건 에러를 한국어로 변환
    if (e.code === '23505') return '이미 존재하는 데이터입니다'
    if (e.code === '23503') return '참조하는 데이터가 존재하지 않습니다'
    if (e.code === '23514') return '데이터 검증에 실패했습니다'
    return e.message
  }
  return fallback
}
