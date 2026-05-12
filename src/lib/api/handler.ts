// API Route 래퍼 — 에러 처리 + 응답 정규화
import { NextResponse } from 'next/server'
import { ApiError, apiError } from './error'
import { ZodError } from 'zod'

type HandlerContext = {
  params?: Promise<Record<string, string | string[]>>
}

type HandlerFn = (request: Request, context?: HandlerContext) => Promise<NextResponse>

export function withApiHandler(handler: HandlerFn): HandlerFn {
  return async (request: Request, context?: HandlerContext) => {
    try {
      return await handler(request, context)
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          apiError(err.code, err.message, err.details),
          { status: err.statusCode }
        )
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          apiError('VALIDATION_ERROR', '입력값 검증 실패', err.issues),
          { status: 400 }
        )
      }
      console.error('Unhandled API error:', err)
      return NextResponse.json(
        apiError('INTERNAL_ERROR', '서버 오류가 발생했습니다'),
        { status: 500 }
      )
    }
  }
}
