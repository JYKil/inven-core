import { dbPool } from '@/db'
import { mapDbError } from '@/lib/api/error'

export async function callRpc<T = unknown>(sqlText: string, values: unknown[] = []): Promise<T> {
  try {
    const result = await dbPool.query<{ result: T }>(sqlText, values)
    return result.rows[0]?.result as T
  } catch (error) {
    const dbError = error as { code?: string; message?: string }
    throw mapDbError({ code: dbError.code, message: dbError.message ?? 'DB 오류' })
  }
}
