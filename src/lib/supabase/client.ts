// Temporary compatibility wrapper while Phase 4 hooks are moved to API routes.
// It deliberately has no @supabase dependency.
type Json = Record<string, unknown>

class QueryBuilder {
  constructor(private table: string) {}

  select(_columns?: string, _options?: Json) { return this }
  insert(_values: unknown) { return this }
  update(_values: unknown) { return this }
  delete() { return this }
  eq(_column: string, _value: unknown) { return this }
  neq(_column: string, _value: unknown) { return this }
  gt(_column: string, _value: unknown) { return this }
  gte(_column: string, _value: unknown) { return this }
  lte(_column: string, _value: unknown) { return this }
  in(_column: string, _values: unknown[]) { return this }
  or(_filter: string) { return this }
  ilike(_column: string, _pattern: string) { return this }
  order(_column: string, _options?: Json) { return this }
  range(_from: number, _to: number) { return this }
  maybeSingle() { return this.single() }
  limit(_count: number) { return this }

  async single() {
    const result = await this
    return { ...result, data: Array.isArray(result.data) ? result.data[0] ?? null : result.data }
  }

  then<TResult1 = { data: any; error: Error | null; count: number | null }, TResult2 = never>(
    resolve?: ((value: { data: any; error: Error | null; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const error = new Error(`Query for ${this.table} has not been migrated to an API route yet`)
    return Promise.resolve({ data: [], error, count: 0 }).then(resolve, reject)
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
    async rpc(name: string, _args?: Json): Promise<{ data: any; error: Error | null }> {
      return { data: null as any, error: new Error(`RPC ${name} has not been migrated to an API route yet`) }
    },
  }
}
