# Phase 0 — 사전 분석 결과
> 분석일: 2026-05-07
> 대상: Vercel + Supabase → 미니PC (PostgreSQL + Better Auth) 마이그레이션

---

## 1. 마이그레이션 SQL 파일 (59개)

### 테이블 구조 (24개 테이블, 7개 그룹)

| 그룹 | 파일 | 테이블 |
|------|------|--------|
| A | group_a | companies, profiles |
| B | group_b | vendors, customers, warehouses, items, bom_headers, bom_lines, reference_codes |
| C | group_c | purchase_orders, po_lines, po_payments |
| D | group_d | inventory_lots, inventory_summary |
| E | group_e | assembly_orders, assembly_order_lines |
| F | group_f | sales_orders, sales_order_lines |
| G | group_g | warehouse_transfers, transfer_lines |

### RLS 정책

- 주 파일: `20260330000009_rls_policies.sql`
- 패치 파일: `fix_vendors_customers_rls`, `fix_auth_hook_rls`, `fix_rpc_security`, `fix_cancel_rpc_security` 등
- 마이그레이션 후에는 앱 레이어 권한 체크로 대체 (모든 쿼리에 `.where(eq(table.companyId, session.companyId))` 필수)

### RPC 함수 (25개)

| 분류 | 함수명 |
|------|--------|
| 비즈니스 로직 | `execute_goods_receipt`, `consume_inventory`, `execute_assembly`, `execute_shipment`, `execute_transfer` |
| 취소 | `cancel_shipment`, `cancel_goods_receipt`, `cancel_transfer`, `cancel_assembly`, `restore_lot_consumptions` |
| 트랜잭션 생성 | `create_company_with_profile`, `admin_create_company`, `create_bom`, `create_bom_version`, `create_purchase_order`, `create_po_payment` |
| 보고서 | `report_inventory_ledger`, `report_warehouse_stock`, `report_sales` |
| 대시보드 | `dashboard_reorder_alerts`, `dashboard_summary` |
| 기준정보 | `get_reference_code_types`, `create_reference_code`, `update_reference_code`, `soft_delete_reference_code` |
| 기타 | `custom_claims_hook`, `rpc_ownership_validation` |

---

## 2. proxy.ts — Auth 흐름

```
요청 → proxy.ts
├── 공개 경로(/login, /signup, /auth/callback) → updateSession만
├── @supabase/ssr createServerClient 생성
├── supabase.auth.getUser() → JWT 기반 인증
├── 미인증 → /login 리다이렉트
└── 인증됨 → profiles 테이블에서 role 조회
    ├── 프로필 없음 → /onboarding
    ├── role = 'pending' → /pending
    └── 정상 → 통과
```

**Better Auth 교체 시 주요 변경 대상:**

| 기존 | 변경 |
|------|------|
| `@supabase/ssr` `createServerClient` | Better Auth `auth.api.getSession()` |
| `supabase.auth.getUser()` | Better Auth session API |
| `/auth/callback/route.ts` (Google OAuth code exchange) | 제거 |
| `updateSession()` (쿠키 갱신) | Better Auth 자동 처리 |

---

## 3. src/types/ — Supabase 자동생성 타입

- 파일: `database.ts` (1,721줄)
- 내용: `Database`, `Tables` (Row/Insert/Update), `Functions` (RPC 파라미터/반환 타입), `Enums`
- **Phase 5에서 전량 제거** → Drizzle `InferSelectModel` / `InferInsertModel` 대체

---

## 4. supabase 클라이언트 호출 위치 (50개 파일)

| 분류 | 파일 수 | 대표 파일 |
|------|---------|-----------|
| 클라이언트 팩토리 | 4개 | `lib/supabase/{client,server,middleware,admin}.ts` |
| TanStack Query 훅 | 12개 | `hooks/use-*.ts` — 모두 Supabase 직접 호출 |
| API Routes | 15개 | `app/api/**` — 서버에서 supabase.rpc() 호출 |
| 인증 페이지 | 5개 | login, signup, callback, onboarding, pending |
| 대시보드/설정/Admin | 7개 | 레이아웃, 설정, 어드민 페이지 |
| Auth 유틸 | 2개 | `lib/api/auth.ts`, `lib/supabase/admin.ts` |

**Phase 4 교체 규모 예상**: 50개 파일, 65개 이상 엔드포인트

---

## 5. Storage 사용 여부

**미사용** — `supabase.storage` API 호출 없음. 파일 업로드 기능 미구현.
→ Phase 4에서 Storage 관련 코드 교체 불필요.

---

## 6. Realtime 사용 여부

**미사용** — `.channel()`, `.subscribe()` 코드 없음.
→ Phase 4에서 Realtime 관련 코드 교체 불필요.

---

## 마이그레이션 복잡도 요약

| 항목 | 복잡도 | 비고 |
|------|--------|------|
| DB 덤프/복원 | 🟢 낮음 | Storage/Realtime 미사용으로 단순 |
| Auth 교체 | 🟡 중간 | Google OAuth 제거, profiles role 로직 유지 |
| 쿼리 교체 | 🔴 높음 | 50개 파일, RPC 25개 재작성 |
| RLS → 앱 레이어 | 🔴 높음 | company_id 필터 전수 검토 필수 (데이터 노출 위험) |
| 타입 재생성 | 🟡 중간 | database.ts → Drizzle 타입 |
