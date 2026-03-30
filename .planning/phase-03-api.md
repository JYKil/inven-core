# Phase 3: API 설계

## 상태
- [x] 설계 완료 (2026-03-30)

## API 접근 방식

### ADR-005: Hybrid API 패턴

- **결정**: 읽기/단순 쓰기는 Supabase 클라이언트 직접 호출, 복잡한 쓰기만 Next.js API Route로 래핑
- **이유**: RLS가 DB 레벨에서 멀티테넌시 보안을 처리하므로, 단순 CRUD에 API Route를 추가하는 것은 보안 이점 없이 보일러플레이트만 증가. Supabase를 선택한 이유(백엔드 최소화)와 일관.
- **영향**: API Route 파일 10개 + TanStack Query 직접 호출 ~55개 = 총 ~65개 엔드포인트

| 패턴 | 개수 | 위치 | 인증 |
|------|------|------|------|
| 읽기 (목록, 상세, 필터) | ~50 | Supabase 클라이언트 직접 (TanStack Query `queryFn`) | RLS 자동 |
| 단순 쓰기 (생성, 수정, 삭제) | ~40 | Supabase 클라이언트 직접 (TanStack Query `mutationFn` + Zod) | RLS 자동 |
| 복잡한 쓰기 (RPC + 엑셀 + 관리자) | ~10 | Next.js API Routes → `supabase.rpc()` | JWT 확인 + RLS |

### ADR-006: 단순 CRUD에 API Route 미사용

- **결정**: Supabase PostgREST가 모든 테이블에 REST API를 자동 제공하므로 Next.js API Route로 중복 래핑하지 않음
- **이유**: 40개의 `supabase.from('table').insert(body)` 래핑 파일은 순수 보일러플레이트. RLS가 이미 보안 처리.
- **영향**: Zod 검증은 클라이언트 mutation 레이어(React Hook Form)에서 수행. DB에 CHECK 제약조건으로 이중 방어.

### ADR-007: company_id 클라이언트 전송 금지

- **결정**: RPC 호출 시 `company_id`는 서버에서 인증된 사용자의 프로필로부터 조회. 클라이언트가 전송하지 않음.
- **이유**: 클라이언트가 `company_id`를 지정할 수 있으면 다른 회사 데이터 접근 가능(tenant spoofing). 서버에서 `profiles.company_id`를 조회하여 사용.
- **영향**: API Route에서 `getAuthenticatedUser()` 헬퍼로 company_id 조회 후 RPC에 전달.

---

## Supabase 클라이언트 설정

### 브라우저 클라이언트 (Client Component용)

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

### 서버 클라이언트 (Server Component / API Route용)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

---

## 공통 패턴

### 인증 / 세션

Supabase Auth가 JWT 기반 인증을 처리. OAuth(Google/Kakao) + 이메일 로그인 지원.

```typescript
// src/lib/api/auth.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getAuthenticatedUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new ApiError(401, '인증이 필요합니다')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) throw new ApiError(403, '프로필을 찾을 수 없습니다')

  return { user, profile }
}

// 역할 검증 헬퍼
export function requireRole(profile: { role: string }, ...roles: string[]) {
  if (!roles.includes(profile.role)) {
    throw new ApiError(403, `권한이 부족합니다. 필요: ${roles.join(', ')}`)
  }
}
```

### 에러 처리

#### 공통 응답 형식 (API Route 전용)

```typescript
// src/lib/api/response.ts
type ApiResponse<T> = {
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
```

#### 에러 코드 정의

| 코드 | HTTP | 설명 |
|------|------|------|
| VALIDATION_ERROR | 400 | Zod 검증 실패 |
| UNAUTHORIZED | 401 | 인증 필요 |
| FORBIDDEN | 403 | 권한 부족 |
| NOT_FOUND | 404 | 리소스 없음 |
| INSUFFICIENT_STOCK | 409 | 재고 부족 (consume_inventory 실패) |
| INVALID_STATUS | 409 | 상태 전환 불가 (예: received→draft) |
| DUPLICATE | 409 | 중복 (UNIQUE 제약조건 위반) |
| INTERNAL_ERROR | 500 | 서버 오류 |

#### PostgreSQL 에러 매핑

```typescript
// src/lib/api/error-mapper.ts
import type { PostgrestError } from '@supabase/supabase-js'

export function mapSupabaseError(error: PostgrestError): ApiError {
  // RPC 함수에서 RAISE한 에러
  if (error.message.includes('재고 부족')) {
    return new ApiError(409, error.message, 'INSUFFICIENT_STOCK')
  }
  if (error.message.includes('Not yet supported')) {
    return new ApiError(400, error.message, 'NOT_SUPPORTED')
  }
  // PostgreSQL 제약조건 에러
  if (error.code === '23505') { // unique_violation
    return new ApiError(409, '중복된 데이터입니다', 'DUPLICATE')
  }
  if (error.code === '23503') { // foreign_key_violation
    return new ApiError(400, '참조하는 데이터가 존재하지 않습니다', 'REFERENCE_ERROR')
  }
  if (error.code === '23514') { // check_violation
    return new ApiError(400, '데이터 검증 실패', 'VALIDATION_ERROR')
  }
  return new ApiError(500, '서버 오류', 'INTERNAL_ERROR')
}
```

### 페이지네이션

Offset 기반. Supabase `.range()`와 `{ count: 'exact' }` 사용.

```typescript
// 공통 페이지네이션 파라미터
type PaginationParams = {
  page?: number       // 기본값 1
  pageSize?: number   // 기본값 20, 최대 100
  sortBy?: string     // 정렬 컬럼명
  sortOrder?: 'asc' | 'desc'  // 기본값 'asc'
}

// 쿼리 적용 헬퍼
function applyPagination(query: any, params: PaginationParams) {
  const page = params.page ?? 1
  const pageSize = Math.min(params.pageSize ?? 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query.range(from, to)
  if (params.sortBy) {
    query.order(params.sortBy, { ascending: params.sortOrder !== 'desc' })
  }
  return query
}

// 응답에 meta 포함
{ data: [...], meta: { count: 150, page: 1, pageSize: 20, totalPages: 8 } }
```

### Zod 스키마 (입력 검증)

파일 위치: `src/lib/validations/` — 도메인별 파일.

```
src/lib/validations/
  partner.ts          # partnerCreateSchema, partnerUpdateSchema
  warehouse.ts        # warehouseCreateSchema, warehouseUpdateSchema
  item.ts             # itemCreateSchema, itemUpdateSchema
  bom.ts              # bomHeaderCreateSchema, bomLineCreateSchema
  purchase-order.ts   # poCreateSchema, poLineSchema
  goods-receipt.ts    # goodsReceiptExecuteSchema
  assembly.ts         # assemblyOrderCreateSchema
  sales.ts            # salesOrderCreateSchema
  transfer.ts         # transferCreateSchema
  import.ts           # excelImportSchema (파일 검증)
```

각 스키마는 `supabase gen types`로 생성된 `Database` 타입과 연동:

```typescript
// src/lib/validations/partner.ts
import { z } from 'zod'

export const partnerCreateSchema = z.object({
  name: z.string().min(1, '업체명을 입력해주세요'),
  partner_type: z.enum(['supplier', 'customer', 'both']).default('both'),
  business_number: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('유효한 이메일을 입력해주세요').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export const partnerUpdateSchema = partnerCreateSchema.partial()

export type PartnerCreate = z.infer<typeof partnerCreateSchema>
```

### TanStack Query 통합

파일 위치: `src/lib/queries/` — 도메인별 파일.

#### 쿼리 키 팩토리

```typescript
// src/lib/queries/keys.ts
export const queryKeys = {
  partners: {
    all: ['partners'] as const,
    list: (filters: PartnerFilters) => [...queryKeys.partners.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.partners.all, 'detail', id] as const,
  },
  warehouses: { /* 동일 패턴 */ },
  items: { /* 동일 패턴 */ },
  bom: { /* 동일 패턴 */ },
  purchaseOrders: { /* 동일 패턴 */ },
  inventory: {
    all: ['inventory'] as const,
    summary: (filters: InventoryFilters) => [...queryKeys.inventory.all, 'summary', filters] as const,
    lots: (filters: LotFilters) => [...queryKeys.inventory.all, 'lots', filters] as const,
    transactions: (filters: TxnFilters) => [...queryKeys.inventory.all, 'transactions', filters] as const,
  },
  assembly: { /* 동일 패턴 */ },
  sales: { /* 동일 패턴 */ },
  transfers: { /* 동일 패턴 */ },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    reorderAlerts: () => [...queryKeys.dashboard.all, 'reorder'] as const,
  },
}
```

#### 조회 훅 패턴 (직접 Supabase 호출)

```typescript
// src/lib/queries/partners.ts
export function usePartners(filters: PartnerFilters) {
  const supabase = createClient()
  return useQuery({
    queryKey: queryKeys.partners.list(filters),
    queryFn: async () => {
      let query = supabase
        .from('partners')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .order('name')
      // RLS가 자동으로 company_id 필터링
      if (filters.partnerType) query = query.eq('partner_type', filters.partnerType)
      if (filters.search) query = query.ilike('name', `%${filters.search}%`)
      // 페이지네이션
      const from = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20)
      query = query.range(from, from + (filters.pageSize ?? 20) - 1)

      const { data, error, count } = await query
      if (error) throw error
      return { data: data ?? [], count: count ?? 0 }
    },
  })
}
```

#### Mutation 훅 패턴 (직접 Supabase 호출)

```typescript
// src/lib/queries/partners.ts
export function useCreatePartner() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: PartnerCreate) => {
      const validated = partnerCreateSchema.parse(input)
      const { data, error } = await supabase
        .from('partners')
        .insert(validated)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}
```

#### RPC Mutation 패턴 (API Route 경유)

```typescript
// src/lib/queries/inventory.ts
export function useExecuteGoodsReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: GoodsReceiptExecute) => {
      const res = await fetch('/api/v1/receipts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error?.message ?? '입고 처리 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      // 여러 쿼리 캐시 무효화 (입고는 lots, summary, transactions, PO 모두 영향)
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
    },
  })
}
```

---

## 슬라이스별 엔드포인트

### 슬라이스 1: 기초 마스터 (Week 1)

**Supabase 직접 호출 (TanStack Query):**

| 리소스 | 작업 | 테이블 | 비고 |
|--------|------|--------|------|
| companies | R, U | companies | 자기 회사 조회/수정. RLS 자동 필터링 |
| profiles | R, U | profiles | 같은 회사 직원 조회, 자기 프로필 수정 |
| partners | CRUD | partners | 업체 등록/조회/수정/소프트삭제 |
| warehouses | CRUD | warehouses | 창고 등록/조회/수정/소프트삭제 |
| items | CRUD | items | 품목 등록/조회/수정. item_type: basic, assembly |
| bom_headers | CRUD | bom_headers | BOM 정의 생성/조회/수정 |
| bom_lines | CRD | bom_lines | BOM 재료 추가/조회/삭제 (bom_header 하위) |

**API Routes (3개):**

| # | 메서드 | 경로 | 용도 |
|---|--------|------|------|
| 1 | POST | `/api/v1/admin/companies` | super_admin 전용 회사 생성 |
| 2 | POST | `/api/v1/import/items` | 엑셀 품목 일괄 업로드 |
| 3 | POST | `/api/v1/import/bom` | 엑셀 BOM 관계 업로드 |

---

### 슬라이스 2: 입고 + 재고 (Week 2)

**Supabase 직접 호출:**

| 리소스 | 작업 | 테이블 | 비고 |
|--------|------|--------|------|
| purchase_orders | CRUD | purchase_orders + lines | PO 생성/조회/수정 (draft 상태만 수정 가능) |
| po_payments | CR | po_payments | 지급 기록/조회 |
| goods_receipts | R | goods_receipts + lines | 입고 조회 (생성은 execute RPC로) |
| inventory_lots | R | inventory_lots | 로트 상세 조회 (FIFO 추적용) |
| inventory_summary | R | inventory_summary | 현재고 조회 (캐시 테이블) |
| inventory_transactions | R | inventory_transactions | 재고 변동 이력 조회 |

**API Routes (3개):**

| # | 메서드 | 경로 | RPC 함수 | 용도 |
|---|--------|------|----------|------|
| 4 | PATCH | `/api/v1/purchase-orders/[id]/confirm` | (직접 update) | PO 상태: draft → confirmed |
| 5 | POST | `/api/v1/receipts/execute` | `execute_goods_receipt` | 입고 처리 + 로트 생성 + 재고 갱신 |
| 6 | POST | `/api/v1/admin/inventory/recalculate` | `recalculate_inventory_summary` | inventory_summary 캐시 보정 |

#### execute_goods_receipt 입력 스키마

```typescript
const goodsReceiptExecuteSchema = z.object({
  po_id: z.string().uuid().nullable(),       // PO 참조 (직접 입고 시 null)
  warehouse_id: z.string().uuid(),            // 입고 창고
  receipt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  lines: z.array(z.object({
    po_line_id: z.string().uuid().nullable(), // PO 라인 참조
    item_id: z.string().uuid(),
    quantity: z.number().positive('수량은 0보다 커야 합니다'),
    unit_price: z.number().nonnegative('단가는 0 이상이어야 합니다'),
  })).min(1, '최소 1개 라인이 필요합니다'),
})
```

#### execute_goods_receipt 트랜잭션 범위

```
1. receipt_number 자동 채번
2. goods_receipts INSERT
3. FOR EACH line:
   a. goods_receipt_lines INSERT
   b. inventory_lots INSERT (source_type='purchase', unit_cost=unit_price)
   c. inventory_summary UPSERT (total_qty +, total_value +)
   d. inventory_transactions INSERT (type='purchase_in')
   e. purchase_order_lines.received_qty 갱신 (PO 연결 시)
4. purchase_orders.status 갱신 (partially_received 또는 received)
5. RETURN { receipt_id, receipt_number, total_qty, total_value }
```

**FIFO 가드**: `consume_inventory()` 함수에서 `costing_method != 'FIFO'`이면 `RAISE 'Not yet supported'`. LIFO/가중평균은 슬라이스 6에서 구현.

---

### 슬라이스 3: 조립 (Week 3)

**Supabase 직접 호출:**

| 리소스 | 작업 | 테이블 | 비고 |
|--------|------|--------|------|
| assembly_orders | CRUD | assembly_orders | 조립 지시 생성/조회/수정 (draft만 수정) |
| assembly_order_lines | R | assembly_order_lines | 조립 재료 상세 조회 |

**API Routes (1개):**

| # | 메서드 | 경로 | RPC 함수 | 용도 |
|---|--------|------|----------|------|
| 7 | POST | `/api/v1/assembly-orders/[id]/execute` | `execute_assembly` | 조립 실행 (재료 FIFO 소비 + 결과물 로트 생성) |

#### execute_assembly 트랜잭션 범위

```
1. assembly_order 상태 검증 (draft만 실행 가능)
2. BOM에서 재료 목록 + 수량 조회
3. FOR EACH material:
   a. required_qty = bom_line.quantity × assembly_order.quantity
   b. consumed_cost = consume_inventory(material) -- FIFO 로트 소비
   c. assembly_order_lines UPDATE (consumed_qty, consumed_cost)
   d. inventory_transactions INSERT (type='assembly_out')
4. total_cost = SUM(consumed_cost), unit_cost = total_cost / quantity
5. inventory_lots INSERT (source_type='assembly', unit_cost=계산값)
6. inventory_summary UPSERT (재료 감소, 결과물 증가)
7. inventory_transactions INSERT (type='assembly_in')
8. assembly_orders UPDATE (status='completed', total_cost, unit_cost)
9. RETURN { assembly_id, total_cost, unit_cost, result_qty }
```

**제한**: 1단계 BOM만 (A+B→C). 2단계 BOM(C+D→E)은 슬라이스 5에서 추가.

---

### 슬라이스 4: 출고 (Week 3-4)

**Supabase 직접 호출:**

| 리소스 | 작업 | 테이블 | 비고 |
|--------|------|--------|------|
| sales_orders | CRUD | sales_orders + lines | 판매 주문 생성/조회/수정 |

**API Routes (2개):**

| # | 메서드 | 경로 | RPC 함수 | 용도 |
|---|--------|------|----------|------|
| 8 | POST | `/api/v1/sales-orders/[id]/execute` | `execute_sales` | 출고 실행 (FIFO 재고 차감 + 매출원가 계산) |
| 9 | PATCH | `/api/v1/sales-orders/[id]/confirm` | (직접 update) | SO 상태: draft → confirmed |

#### execute_sales 트랜잭션 범위

```
1. sales_order 상태 검증 (confirmed만 실행 가능)
2. FOR EACH line:
   a. cost_of_goods = consume_inventory(item, warehouse, qty) -- FIFO
   b. sales_order_lines UPDATE (cost_of_goods)
   c. inventory_transactions INSERT (type='sale_out')
3. sales_orders UPDATE (status='shipped')
4. RETURN { order_id, total_cogs, total_revenue, gross_profit }
```

---

### 슬라이스 5: 창고 이동 + 대시보드 (Week 4-5)

**Supabase 직접 호출:**

| 리소스 | 작업 | 테이블 | 비고 |
|--------|------|--------|------|
| warehouse_transfers | CRUD | warehouse_transfers + lines | 이동 전표 생성/조회 |
| dashboard (종합) | R | inventory_summary + joins | 품목별/창고별 재고 현황 집계 |
| reorder_alerts | R | items + inventory_summary | min_stock_qty 미달 품목 조회 |

**대시보드 쿼리 예시:**

```typescript
// 재고 현황 종합 (품목별 + 창고별)
supabase
  .from('inventory_summary')
  .select('*, item:items(name, code, category), warehouse:warehouses(name, code)')
  .order('item(name)')

// 발주 알람 (최소 재고 미달)
supabase
  .from('items')
  .select('id, code, name, min_stock_qty, inventory_summary(warehouse_id, total_qty)')
  .gt('min_stock_qty', 0)
  // 클라이언트에서 total_qty < min_stock_qty 필터링
```

**API Routes (1개):**

| # | 메서드 | 경로 | RPC 함수 | 용도 |
|---|--------|------|----------|------|
| 10 | POST | `/api/v1/transfers/execute` | `execute_warehouse_transfer` | 창고 이동 (출발지 FIFO 소비 + 도착지 로트 생성) |

#### execute_warehouse_transfer 트랜잭션 범위

```
1. from_warehouse_id != to_warehouse_id 검증
2. FOR EACH line:
   a. consumed_cost = consume_inventory(item, from_warehouse, qty) -- FIFO
   b. unit_cost = consumed_cost / qty
   c. inventory_lots INSERT (to_warehouse, source_type='transfer_in', unit_cost)
   d. inventory_summary UPSERT (to_warehouse: total_qty +, total_value +)
   e. inventory_transactions INSERT (transfer_out, transfer_in)
3. warehouse_transfers UPDATE (status='completed')
4. RETURN { transfer_id, lines_count, total_transferred_qty }
```

**2단계 BOM 추가**: 이 슬라이스에서 `execute_assembly`를 확장하여 재귀적 BOM(C+D→E) 지원. C가 재고에 없으면 C의 BOM을 먼저 조립하는 로직 추가.

---

### 슬라이스 6: 원가 확장 (Week 5-6, 선택)

**API Routes: 기존 함수 수정 (새 Route 없음)**

| 변경 대상 | 내용 |
|-----------|------|
| `consume_inventory()` | LIFO: `ORDER BY lot_date DESC` 분기 활성화 |
| `consume_inventory()` | 가중평균: `inventory_summary.total_value / total_qty`로 단가 계산 |
| companies 수정 | `costing_method` 변경 시 주의사항 UI 표시 |

가중평균 로직:
```
가중평균 단가 = inventory_summary.total_value / inventory_summary.total_qty
출고 원가 = 가중평균 단가 × 출고 수량
로트는 여전히 기록하되, 소비 시 가중평균 단가를 사용
```

---

## API Routes 디렉토리 구조

```
src/app/api/v1/
├── admin/
│   ├── companies/
│   │   └── route.ts                    # [1] POST: super_admin 회사 생성
│   └── inventory/
│       └── recalculate/
│           └── route.ts                # [6] POST: 캐시 보정
├── import/
│   ├── items/
│   │   └── route.ts                    # [2] POST: 엑셀 품목 업로드
│   └── bom/
│       └── route.ts                    # [3] POST: 엑셀 BOM 업로드
├── purchase-orders/
│   └── [id]/
│       └── confirm/
│           └── route.ts                # [4] PATCH: PO 상태 전환
├── receipts/
│   └── execute/
│       └── route.ts                    # [5] POST: 입고 RPC
├── assembly-orders/
│   └── [id]/
│       └── execute/
│           └── route.ts                # [7] POST: 조립 RPC
├── sales-orders/
│   └── [id]/
│       ├── execute/
│       │   └── route.ts                # [8] POST: 출고 RPC
│       └── confirm/
│           └── route.ts                # [9] PATCH: SO 상태 전환
└── transfers/
    └── execute/
        └── route.ts                    # [10] POST: 창고 이동 RPC
```

## API Route 핸들러 공통 패턴

```typescript
// 예시: src/app/api/v1/receipts/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/api/auth'
import { goodsReceiptExecuteSchema } from '@/lib/validations/goods-receipt'
import { apiSuccess, apiError } from '@/lib/api/response'
import { mapSupabaseError } from '@/lib/api/error-mapper'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { profile } = await getAuthenticatedUser(supabase)

    const body = await request.json()
    const validated = goodsReceiptExecuteSchema.parse(body)

    const { data, error } = await supabase.rpc('execute_goods_receipt', {
      p_company_id: profile.company_id,  // 서버에서 조회 (클라이언트 전송 금지)
      p_receipt_data: validated,
    })

    if (error) throw mapSupabaseError(error)
    return NextResponse.json(apiSuccess(data))
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        apiError('VALIDATION_ERROR', e.errors[0].message),
        { status: 400 }
      )
    }
    if (e instanceof ApiError) {
      return NextResponse.json(
        apiError(e.code, e.message),
        { status: e.status }
      )
    }
    console.error('Unhandled error:', e)
    return NextResponse.json(
      apiError('INTERNAL_ERROR', '서버 오류가 발생했습니다'),
      { status: 500 }
    )
  }
}
```

---

## Excel 업로드 설계

### 기술 스택

- 파싱 라이브러리: **SheetJS (xlsx)** — MIT 라이센스, Node.js 지원
- 파일 제한: .xlsx, .xls만 허용, 최대 5MB
- 프로세스: 2단계 (미리보기 → 확인)

### 품목 업로드 (POST /api/v1/import/items)

#### 1단계: 업로드 + 미리보기

```
클라이언트 → multipart/form-data (엑셀 파일) → 서버
서버: 파싱 → 컬럼 매핑 → Zod 검증 → 미리보기 반환
```

**한국어/영어 컬럼 자동 매핑:**

| 인식 가능한 헤더 | 매핑 필드 |
|-----------------|----------|
| 품목코드, code | code |
| 품목명, name | name |
| 분류, 카테고리, category | category |
| 단위, unit | unit |
| 유형, type | item_type |
| 최소재고, min_stock | min_stock_qty |
| 설명, description | description |

**응답 (미리보기):**

```json
{
  "success": true,
  "data": {
    "total": 150,
    "valid": [
      { "row": 2, "code": "A001", "name": "볼트 M10", "category": "부품", "unit": "EA" }
    ],
    "errors": [
      { "row": 5, "field": "code", "message": "품목코드가 비어있습니다" },
      { "row": 12, "field": "code", "message": "이미 등록된 품목코드입니다: B003" }
    ],
    "validCount": 145,
    "errorCount": 5
  }
}
```

#### 2단계: 확인 + DB 저장

```
클라이언트 → { confirm: true, rows: [...검증 통과 행...] } → 서버
서버: batch INSERT → 결과 반환
```

**응답:**

```json
{ "success": true, "data": { "inserted": 145, "skipped": 5 } }
```

### BOM 업로드 (POST /api/v1/import/bom)

동일 2단계 프로세스. 시트 형식:

| 결과품목코드 | 재료품목코드 | 수량 | 버전 |
|-------------|-------------|------|------|
| C001 | A001 | 1 | 1 |
| C001 | B001 | 2 | 1 |
| E001 | C001 | 2 | 1 |
| E001 | D001 | 1 | 1 |

처리 로직: 품목코드 → UUID 변환 후 bom_headers + bom_lines INSERT. 같은 결과품목코드+버전은 하나의 bom_header로 묶음.

### 파일 구조

```
src/lib/import/
├── excel-parser.ts   # SheetJS 래퍼: 파일 파싱 + 시트 → JSON 변환
├── column-mapper.ts  # 한국어/영어 컬럼 헤더 자동 매핑
├── items.ts          # 품목 전용: 매핑 + 검증 + DB 충돌 검사
└── bom.ts            # BOM 전용: 코드→UUID 변환 + 관계 검증
```

---

## 전체 파일 구조 요약 (API 관련)

```
src/
├── app/
│   └── api/v1/                         # API Route 10개 (위 디렉토리 구조 참조)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # 브라우저 클라이언트
│   │   └── server.ts                   # 서버 클라이언트 (cookies 기반)
│   ├── api/
│   │   ├── auth.ts                     # getAuthenticatedUser, requireRole
│   │   ├── response.ts                 # ApiResponse, apiSuccess, apiError
│   │   ├── error-mapper.ts             # PostgreSQL 에러 → API 에러 변환
│   │   └── errors.ts                   # ApiError 클래스, 에러 코드 상수
│   ├── validations/
│   │   ├── partner.ts
│   │   ├── warehouse.ts
│   │   ├── item.ts
│   │   ├── bom.ts
│   │   ├── purchase-order.ts
│   │   ├── goods-receipt.ts
│   │   ├── assembly.ts
│   │   ├── sales.ts
│   │   ├── transfer.ts
│   │   └── import.ts
│   ├── queries/
│   │   ├── keys.ts                     # 쿼리 키 팩토리
│   │   ├── partners.ts                 # usePartners, useCreatePartner, ...
│   │   ├── warehouses.ts
│   │   ├── items.ts
│   │   ├── bom.ts
│   │   ├── purchase-orders.ts
│   │   ├── inventory.ts               # useInventorySummary, useExecuteGoodsReceipt, ...
│   │   ├── assembly.ts
│   │   ├── sales.ts
│   │   ├── transfers.ts
│   │   └── dashboard.ts               # useDashboardSummary, useReorderAlerts
│   └── import/
│       ├── excel-parser.ts
│       ├── column-mapper.ts
│       ├── items.ts
│       └── bom.ts
└── types/
    └── database.ts                     # supabase gen types 자동 생성
```

---

## 결정 사항

| ADR | 결정 | 이유 |
|-----|------|------|
| ADR-005 | Hybrid API 패턴 | RLS가 보안 처리. API Route는 복잡한 로직(RPC, 엑셀, 상태전환)에만 사용 |
| ADR-006 | 단순 CRUD에 API Route 미사용 | 40개 프록시 파일은 순수 보일러플레이트. Supabase 직접 호출 + Zod 검증으로 충분 |
| ADR-007 | company_id 서버 조회 | 클라이언트가 company_id를 지정하면 tenant spoofing 가능. 서버에서 profiles 조회 |

---

## 엔드포인트 요약

| 카테고리 | 개수 | 방식 |
|----------|------|------|
| 단순 CRUD (마스터, PO, SO 등) | ~40 | Supabase 직접 |
| 조회/필터 (재고, 대시보드 등) | ~10 | Supabase 직접 |
| 상태 전환 (PO/SO confirm) | 2 | API Route |
| 복잡한 RPC (입고/조립/출고/이동) | 4+1 | API Route |
| 엑셀 업로드 | 2 | API Route |
| 관리자 (회사 생성, 캐시 보정) | 2 | API Route |
| **합계** | **~65** | |

## RPC 함수 시그니처

| # | 함수명 | 입력 | 반환 | 슬라이스 |
|---|--------|------|------|----------|
| 1 | `consume_inventory` | `(company_id, item_id, warehouse_id, qty, transaction_id)` | `numeric` (소비 원가) | 2 |
| 2 | `execute_goods_receipt` | `(company_id, receipt_data jsonb)` | `jsonb` | 2 |
| 3 | `execute_assembly` | `(company_id, assembly_order_id)` | `jsonb` | 3 |
| 4 | `execute_sales` | `(company_id, sales_order_id)` | `jsonb` | 4 |
| 5 | `execute_warehouse_transfer` | `(company_id, transfer_id)` | `jsonb` | 5 |
| 6 | `recalculate_inventory_summary` | `(company_id, item_id, warehouse_id)` | `jsonb` | 2 |
