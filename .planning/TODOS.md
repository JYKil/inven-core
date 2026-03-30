# TODOS

## P0 — 사전 작업 (병렬 진행 전 완료 필수)

### ~~`/design-consultation` 실행하여 DESIGN.md 생성~~ ✅ 완료

### 사전 작업 목록
병렬 작업 전 하나의 터미널에서 순서대로 완료할 것.
1. DB 마이그레이션 생성 (22개 테이블 전체, 그룹 A~G)
2. RLS 정책 + Custom Claims Hook 설정
3. Supabase 클라이언트 설정 (클라이언트/서버 헬퍼, 환경변수)
4. 공통 shadcn 컴포넌트 설치 (table, input, dialog, select, form, badge, toast 등)
5. TanStack Query + Zustand 프로바이더 설정
6. 공통 레이아웃 + 사이드바 구현 (DESIGN.md 기반)

---

## P0.5 — 슬라이스 1+2 병렬 구현

### 병렬 전략
터미널 2개로 동시 진행. DB는 사전 작업에서 이미 생성 완료.

### 터미널 A: 슬라이스 1 — 기초 마스터
- partners CRUD (거래처)
- warehouses CRUD (창고)
- items CRUD (품목)
- bom CRUD (BOM 정의/재료)
- 담당 디렉토리:
  - `src/app/(dashboard)/partners/`
  - `src/app/(dashboard)/warehouses/`
  - `src/app/(dashboard)/items/`
  - `src/app/(dashboard)/bom/`
  - `src/hooks/use-partners.ts`, `use-warehouses.ts`, `use-items.ts`, `use-bom.ts`

### 터미널 B: 슬라이스 2 — 입고 + 재고
- purchase_orders CRUD (발주서)
- goods_receipts + 입고 RPC (`execute_goods_receipt`)
- inventory 조회 (inventory_summary, inventory_lots)
- po_payments CRUD (지급 관리)
- PO 초과 입고 방지 로직 포함
- 담당 디렉토리:
  - `src/app/(dashboard)/purchase-orders/`
  - `src/app/(dashboard)/goods-receipts/`
  - `src/app/(dashboard)/inventory/`
  - `src/app/(dashboard)/po-payments/`
  - `src/hooks/use-purchase-orders.ts`, `use-goods-receipts.ts`, `use-inventory.ts`
  - `supabase/migrations/` (RPC 함수: `consume_inventory`, `execute_goods_receipt`)

### 충돌 주의 영역
아래 파일/디렉토리는 **한쪽 터미널에서만** 수정할 것. 동시에 수정하면 충돌 발생.
- `src/lib/` — 공통 유틸, Supabase 클라이언트 → 사전 작업에서 생성 완료, 이후 수정 금지
- `src/components/ui/` — shadcn 컴포넌트 → 사전 작업에서 설치 완료, 추가 필요 시 한쪽에서만
- `src/app/(dashboard)/layout.tsx` — 사이드바 네비게이션 → **터미널 A에서만 수정**
- `src/types/` — DB 타입 → 사전 작업에서 생성, 이후 수정 금지
- `package.json` — 패키지 추가 시 한쪽에서만

---

## P1 — 슬라이스 2 구현 시

### PO 초과 입고 방지
execute_goods_receipt에서 `received_qty + 입고 qty > ordered_qty`일 때 RAISE.
초과 입고를 막지 않으면 재고 데이터가 PO와 불일치.
슬라이스 2 구현 시 반드시 포함.

---

## P2 — 슬라이스 5 완료 후

### 롤백/정정 트랜잭션
입고 취소, 조립 취소, 출고 정정 등 역방향 트랜잭션 RPC 함수 설계 및 구현.
FIFO 역전 코스팅(원가 복원) 로직이 복잡하므로 정방향 FIFO가 완성된 후 설계.
실무에서 입력 오류는 필연적이므로 첫 고객 실사용 전까지 구현 필요.

---

## P3 — 참고 사항

### 일정 가이드라인
각 슬라이스의 Week 단위 일정은 가이드라인이지 기한이 아님.
슬라이스 1+2 병렬 진행으로 기존 1.5~2주 → 단축 예상.
엑셀 업로드는 고객 엑셀 샘플 확보 후 구현.
