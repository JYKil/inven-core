type Json = Record<string, unknown>

export type QueryOp =
  | { type: 'select'; columns?: string; options?: Json }
  | { type: 'insert'; values: unknown }
  | { type: 'update'; values: unknown }
  | { type: 'delete' }
  | { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lte' | 'ilike'; column: string; value: unknown }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'or'; filter: string }
  | { type: 'order'; column: string; options?: Json }
  | { type: 'range'; from: number; to: number }
  | { type: 'limit'; count: number }

type DbQueryOptions = {
  single?: boolean
}

async function postQuery(payload: Json) {
  const res = await fetch('/api/db-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      data: null,
      error: new Error(body.error?.message ?? body.error ?? 'DB 요청 실패'),
      count: null,
    }
  }
  return {
    data: body.data ?? null,
    error: null,
    count: body.count ?? null,
  }
}

export async function queryDb<T = any>(
  table: string,
  ops: QueryOp[],
  options: DbQueryOptions = {},
): Promise<{ data: T | null; error: Error | null; count: number | null }> {
  const result = await postQuery({ mode: 'query', table, ops, single: options.single })
  return {
    ...result,
    data: result.data as T | null,
  }
}

export async function rpcDb<T = any>(
  name: string,
  args?: Json,
): Promise<{ data: T | null; error: Error | null }> {
  const result = await postQuery({ mode: 'rpc', name, args: args ?? {} })
  return { data: result.data as T | null, error: result.error }
}

export async function getCurrentUser() {
  const res = await fetch('/api/auth/me')
  if (!res.ok) return { data: { user: null }, error: new Error('인증이 필요합니다') }
  const data = await res.json()
  return { data: { user: data.user }, error: null }
}
