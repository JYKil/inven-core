type Json = Record<string, unknown>

type QueryOp =
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

class QueryBuilder {
  private ops: QueryOp[] = []

  constructor(private table: string) {}

  select(columns?: string, options?: Json) { this.ops.push({ type: 'select', columns, options }); return this }
  insert(values: unknown) { this.ops.push({ type: 'insert', values }); return this }
  update(values: unknown) { this.ops.push({ type: 'update', values }); return this }
  delete() { this.ops.push({ type: 'delete' }); return this }
  eq(column: string, value: unknown) { this.ops.push({ type: 'eq', column, value }); return this }
  neq(column: string, value: unknown) { this.ops.push({ type: 'neq', column, value }); return this }
  gt(column: string, value: unknown) { this.ops.push({ type: 'gt', column, value }); return this }
  gte(column: string, value: unknown) { this.ops.push({ type: 'gte', column, value }); return this }
  lte(column: string, value: unknown) { this.ops.push({ type: 'lte', column, value }); return this }
  in(column: string, values: unknown[]) { this.ops.push({ type: 'in', column, values }); return this }
  or(filter: string) { this.ops.push({ type: 'or', filter }); return this }
  ilike(column: string, pattern: string) { this.ops.push({ type: 'ilike', column, value: pattern }); return this }
  order(column: string, options?: Json) { this.ops.push({ type: 'order', column, options }); return this }
  range(from: number, to: number) { this.ops.push({ type: 'range', from, to }); return this }
  maybeSingle() { return this.single() }
  limit(count: number) { this.ops.push({ type: 'limit', count }); return this }

  async single() {
    const result = await postQuery({ mode: 'query', table: this.table, ops: this.ops, single: true })
    return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }
  }

  then<TResult1 = { data: any; error: Error | null; count: number | null }, TResult2 = never>(
    resolve?: ((value: { data: any; error: Error | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return postQuery({ mode: 'query', table: this.table, ops: this.ops }).then(resolve, reject)
  }
}

export function createClient() {
  return {
    auth: {
      async getUser() {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return { data: { user: null }, error: new Error('인증이 필요합니다') }
        const data = await res.json()
        return { data: { user: data.user }, error: null }
      },
      async getSession() {
        const res = await fetch('/api/auth/me')
        if (!res.ok) return { data: { session: null }, error: null }
        const data = await res.json()
        return { data: { session: { user: data.user, access_token: '' } }, error: null }
      },
    },
    from(table: string) {
      return new QueryBuilder(table)
    },
    async rpc(name: string, args?: Json): Promise<{ data: any; error: Error | null }> {
      const result = await postQuery({ mode: 'rpc', name, args: args ?? {} })
      return { data: result.data, error: result.error }
    },
  }
}
