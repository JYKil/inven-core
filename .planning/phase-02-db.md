# Phase 2: DB 설계

## 상태
- [x] 설계 완료 (2026-03-30)

## 사용 DB
PostgreSQL (Supabase 매니지드)
- 마이그레이션: `supabase db migration` CLI, git 관리
- 타입 생성: `supabase gen types typescript` → `src/types/database.ts`

## 설계 원칙
1. **멀티테넌시**: 모든 비즈니스 테이블에 `company_id` + RLS
2. **FIFO 로트 추적**: `inventory_lots`로 입고 단위별 수량/단가 추적
3. **감사 추적**: `inventory_transactions`에 모든 재고 변동 기록
4. **소프트 삭제**: 마스터 데이터는 `is_active` 플래그
5. **공통 컬럼**: `id(UUID PK)`, `created_at`, `updated_at`, `company_id`
6. **숫자 정밀도**: 수량 `numeric(15,4)`, 단가 `numeric(18,4)`, 금액 `numeric(18,2)`

---

## ERD

```
companies ─┬─< profiles (auth.users 1:1)
            ├─< partners
            ├─< warehouses
            ├─< items ──< bom_headers ──< bom_lines
            │
            ├─< purchase_orders ──< purchase_order_lines
            │        └──< po_payments
            │
            ├─< goods_receipts ──< goods_receipt_lines ──> inventory_lots (생성)
            │
            ├─< assembly_orders ──< assembly_order_lines
            │        └──> inventory_lots (소비 + 생성)
            │
            ├─< sales_orders ──< sales_order_lines
            │        └──> inventory_lots (소비)
            │
            ├─< warehouse_transfers ──< warehouse_transfer_lines
            │        └──> inventory_lots (소비 + 생성)
            │
            ├─< inventory_lots ──< inventory_lot_consumptions
            ├─< inventory_summary
            └─< inventory_transactions
```

---

## 테이블 정의

### 그룹 A: 사용자/회사

#### companies
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| name | varchar(200) | NOT NULL | 회사명 |
| business_number | varchar(20) | UNIQUE | 사업자등록번호 |
| address | text | | 주소 |
| phone | varchar(20) | | 전화번호 |
| costing_method | varchar(20) | NOT NULL DEFAULT 'FIFO' | FIFO, LIFO, WEIGHTED_AVG |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `costing_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVG')`

#### profiles
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, FK → auth.users(id) ON DELETE CASCADE | Supabase Auth user id |
| company_id | uuid | FK → companies(id), NULLABLE | super_admin은 NULL |
| role | varchar(20) | NOT NULL DEFAULT 'normal' | super_admin, company_admin, normal |
| display_name | varchar(100) | | 표시명 |
| email | varchar(255) | NOT NULL | |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `role IN ('super_admin', 'company_admin', 'normal')`
- CHECK: `(role = 'super_admin' AND company_id IS NULL) OR (role != 'super_admin' AND company_id IS NOT NULL)`
- 인덱스: `idx_profiles_company_id ON profiles(company_id)`

---

### 그룹 B: 기초 마스터

#### partners (거래처)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| name | varchar(200) | NOT NULL | 업체명 |
| partner_type | varchar(20) | NOT NULL DEFAULT 'both' | supplier, customer, both |
| business_number | varchar(20) | | 사업자번호 |
| contact_name | varchar(100) | | 담당자명 |
| phone | varchar(20) | | |
| email | varchar(255) | | |
| address | text | | |
| notes | text | | 비고 |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, name)`
- CHECK: `partner_type IN ('supplier', 'customer', 'both')`
- 인덱스: `idx_partners_company_id ON partners(company_id)`

#### warehouses (창고)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| code | varchar(20) | NOT NULL | 창고코드 |
| name | varchar(200) | NOT NULL | 창고명 |
| location | text | | 창고 위치 |
| phone | varchar(20) | | 연락처 |
| notes | text | | |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, code)`
- 인덱스: `idx_warehouses_company_id ON warehouses(company_id)`

#### items (품목)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| code | varchar(50) | NOT NULL | 품목코드 |
| name | varchar(200) | NOT NULL | 품목명 |
| category | varchar(100) | | 분류 |
| unit | varchar(20) | NOT NULL DEFAULT 'EA' | 단위 (EA, KG, L 등) |
| item_type | varchar(20) | NOT NULL DEFAULT 'basic' | basic(기초), assembly(조립 가능) |
| description | text | | 설명 |
| min_stock_qty | numeric(15,4) | DEFAULT 0 | 최소 재고 수량 (발주 알람용) |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, code)`
- CHECK: `item_type IN ('basic', 'assembly')`
- 인덱스: `idx_items_company_id ON items(company_id)`

#### bom_headers (BOM 정의)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| product_item_id | uuid | NOT NULL, FK → items(id) | 결과 품목 (예: C) |
| version | int | NOT NULL DEFAULT 1 | BOM 버전 |
| is_active | boolean | NOT NULL DEFAULT true | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(product_item_id, version)`
- 인덱스: `idx_bom_headers_company_id ON bom_headers(company_id)`

#### bom_lines (BOM 구성 재료)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| bom_header_id | uuid | NOT NULL, FK → bom_headers(id) ON DELETE CASCADE | |
| material_item_id | uuid | NOT NULL, FK → items(id) | 재료 품목 (예: A, B) |
| quantity | numeric(15,4) | NOT NULL | 결과물 1단위 생산에 필요한 수량 |
| sort_order | int | NOT NULL DEFAULT 0 | 표시 순서 |

- UNIQUE: `(bom_header_id, material_item_id)`
- CHECK: `quantity > 0`

> **다단계 BOM 표현**: A+B→C, C+D→E의 경우
> - bom_headers #1: product_item_id = C
>   - bom_lines: material A (qty 1), material B (qty 2)
> - bom_headers #2: product_item_id = E
>   - bom_lines: material C (qty 2), material D (qty 1)
> - 별도 "레벨" 컬럼 불필요. 재귀 CTE로 전체 BOM 트리 탐색 가능.

---

### 그룹 C: 구매/입고

#### purchase_orders (발주서)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| po_number | varchar(50) | NOT NULL | PO 번호 |
| partner_id | uuid | NOT NULL, FK → partners(id) | 공급업체 |
| order_date | date | NOT NULL | 발주일 |
| expected_date | date | | 예상 입고일 |
| status | varchar(20) | NOT NULL DEFAULT 'draft' | draft, confirmed, partially_received, received, cancelled |
| total_amount | numeric(18,2) | NOT NULL DEFAULT 0 | 총 금액 |
| notes | text | | |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, po_number)`
- CHECK: `status IN ('draft', 'confirmed', 'partially_received', 'received', 'cancelled')`
- 인덱스: `idx_po_company_status ON purchase_orders(company_id, status)`

#### purchase_order_lines (발주 라인)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| po_id | uuid | NOT NULL, FK → purchase_orders(id) ON DELETE CASCADE | |
| item_id | uuid | NOT NULL, FK → items(id) | 품목 |
| ordered_qty | numeric(15,4) | NOT NULL | 발주 수량 |
| received_qty | numeric(15,4) | NOT NULL DEFAULT 0 | 누적 입고 수량 |
| unit_price | numeric(18,4) | NOT NULL | 단가 |
| line_amount | numeric(18,2) | NOT NULL | 라인 금액 (ordered_qty × unit_price) |

- CHECK: `ordered_qty > 0`
- CHECK: `received_qty >= 0`
- CHECK: `unit_price >= 0`

#### goods_receipts (입고)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| receipt_number | varchar(50) | NOT NULL | 입고 번호 |
| po_id | uuid | FK → purchase_orders(id) | PO 참조 (직접 입고 시 NULL) |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | 입고 창고 |
| receipt_date | date | NOT NULL | 입고일 |
| status | varchar(20) | NOT NULL DEFAULT 'confirmed' | confirmed, cancelled |
| notes | text | | |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, receipt_number)`

#### goods_receipt_lines (입고 라인)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| receipt_id | uuid | NOT NULL, FK → goods_receipts(id) ON DELETE CASCADE | |
| po_line_id | uuid | FK → purchase_order_lines(id) | PO 라인 참조 |
| item_id | uuid | NOT NULL, FK → items(id) | |
| quantity | numeric(15,4) | NOT NULL | 입고 수량 |
| unit_price | numeric(18,4) | NOT NULL | 입고 단가 |

- CHECK: `quantity > 0`
- CHECK: `unit_price >= 0`

> **입고 시 처리 (DB function)**:
> 1. goods_receipt_lines INSERT
> 2. inventory_lots INSERT (source_type='purchase', unit_cost=unit_price)
> 3. inventory_summary UPSERT (total_qty +, total_value +)
> 4. inventory_transactions INSERT (type='purchase_in')
> 5. purchase_order_lines.received_qty 갱신
> 6. purchase_orders.status 갱신

#### po_payments (PO 지급 - 분할 지급)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| po_id | uuid | NOT NULL, FK → purchase_orders(id) | |
| payment_date | date | NOT NULL | 지급일 |
| amount | numeric(18,2) | NOT NULL | 지급 금액 |
| payment_method | varchar(50) | | 지급 방법 |
| notes | text | | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `amount > 0`
- 인덱스: `idx_po_payments_po_id ON po_payments(po_id)`

---

### 그룹 D: 재고 핵심 (FIFO 로트 추적)

#### inventory_lots (로트 - 핵심 테이블)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| item_id | uuid | NOT NULL, FK → items(id) | |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | |
| lot_date | timestamptz | NOT NULL | 로트 생성일 (FIFO/LIFO 정렬 기준) |
| unit_cost | numeric(18,4) | NOT NULL | 로트 단가 |
| initial_qty | numeric(15,4) | NOT NULL | 최초 수량 |
| remaining_qty | numeric(15,4) | NOT NULL | 잔여 수량 |
| source_type | varchar(20) | NOT NULL | purchase, assembly, transfer_in |
| source_id | uuid | | 원본 문서 라인 ID |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `remaining_qty >= 0`
- CHECK: `initial_qty > 0`
- CHECK: `unit_cost >= 0`
- CHECK: `source_type IN ('purchase', 'assembly', 'transfer_in')`
- 인덱스 (FIFO 최적화): `idx_lots_fifo ON inventory_lots(company_id, item_id, warehouse_id, lot_date ASC) WHERE remaining_qty > 0`
- 인덱스 (LIFO 최적화): `idx_lots_lifo ON inventory_lots(company_id, item_id, warehouse_id, lot_date DESC) WHERE remaining_qty > 0`

> **이 테이블이 전체 시스템의 핵심이다.**
> - 입고 → 새 lot 생성 (source_type='purchase')
> - 조립 결과 → 새 lot 생성 (source_type='assembly', unit_cost=재료비 합산)
> - 출고/조립 재료 → FIFO 순서로 remaining_qty 차감
> - 창고 이동 → 출발지 lot 소비 + 도착지 새 lot 생성 (source_type='transfer_in')

#### inventory_lot_consumptions (로트 소비 이력)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| lot_id | uuid | NOT NULL, FK → inventory_lots(id) | 소비된 로트 |
| consumed_qty | numeric(15,4) | NOT NULL | 소비 수량 |
| transaction_id | uuid | NOT NULL, FK → inventory_transactions(id) | 관련 트랜잭션 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `consumed_qty > 0`
- 인덱스: `idx_lot_consumptions_lot_id ON inventory_lot_consumptions(lot_id)`
- 인덱스: `idx_lot_consumptions_txn_id ON inventory_lot_consumptions(transaction_id)`

#### inventory_summary (현재고 요약 캐시)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| item_id | uuid | NOT NULL, FK → items(id) | |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | |
| total_qty | numeric(15,4) | NOT NULL DEFAULT 0 | 현재 총 수량 |
| total_value | numeric(18,2) | NOT NULL DEFAULT 0 | 현재 총 재고가치 |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, item_id, warehouse_id)`

> inventory_lots의 집계 캐시. DB function에서 lot 변동 시 자동 갱신한다.
> 조회 성능 최적화 목적으로, 매번 lots를 SUM하지 않고 빠르게 현재고를 확인할 수 있다.

#### inventory_transactions (재고 변동 감사 로그)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| item_id | uuid | NOT NULL, FK → items(id) | |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | |
| transaction_type | varchar(30) | NOT NULL | purchase_in, assembly_in, assembly_out, sale_out, transfer_in, transfer_out, adjustment |
| quantity | numeric(15,4) | NOT NULL | 양수=입고, 음수=출고 |
| unit_cost | numeric(18,4) | | 단가 |
| total_cost | numeric(18,2) | | 총 원가 |
| reference_type | varchar(30) | | goods_receipt, assembly_order, sales_order, transfer |
| reference_id | uuid | | 참조 문서 ID |
| transaction_date | timestamptz | NOT NULL | |
| notes | text | | |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

- CHECK: `transaction_type IN ('purchase_in', 'assembly_in', 'assembly_out', 'sale_out', 'transfer_in', 'transfer_out', 'adjustment')`
- 인덱스: `idx_txn_item_date ON inventory_transactions(company_id, item_id, transaction_date)`
- 인덱스: `idx_txn_reference ON inventory_transactions(reference_type, reference_id)`

---

### 그룹 E: 조립 (BOM 생산)

#### assembly_orders (조립 지시)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| order_number | varchar(50) | NOT NULL | 조립 번호 |
| bom_header_id | uuid | NOT NULL, FK → bom_headers(id) | 사용 BOM |
| product_item_id | uuid | NOT NULL, FK → items(id) | 결과 품목 |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | 조립 창고 |
| quantity | numeric(15,4) | NOT NULL | 조립 수량 |
| total_cost | numeric(18,2) | | 조립 총원가 (재료비 합산) |
| unit_cost | numeric(18,4) | | 결과물 단위 원가 |
| assembly_date | date | NOT NULL | 조립일 |
| status | varchar(20) | NOT NULL DEFAULT 'draft' | draft, completed, cancelled |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, order_number)`
- CHECK: `status IN ('draft', 'completed', 'cancelled')`
- CHECK: `quantity > 0`

#### assembly_order_lines (조립 재료 상세)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| assembly_order_id | uuid | NOT NULL, FK → assembly_orders(id) ON DELETE CASCADE | |
| material_item_id | uuid | NOT NULL, FK → items(id) | 재료 품목 |
| required_qty | numeric(15,4) | NOT NULL | 필요 수량 (BOM qty × 조립 수량) |
| consumed_qty | numeric(15,4) | NOT NULL DEFAULT 0 | 실제 소비 수량 |
| consumed_cost | numeric(18,2) | NOT NULL DEFAULT 0 | 소비 원가 (FIFO 계산 결과) |

> **조립 처리 (DB function)**:
> 1. BOM에서 재료 목록 + 수량 조회
> 2. 각 재료에 대해 FIFO 로트 소비 → consumed_cost 계산
> 3. total_cost = SUM(consumed_cost), unit_cost = total_cost / quantity
> 4. 결과물 lot 생성 (source_type='assembly', unit_cost=계산된 단위원가)
> 5. inventory_summary 갱신 (재료 감소, 결과물 증가)
> 6. inventory_transactions 기록 (assembly_out × 재료 수, assembly_in × 1)

---

### 그룹 F: 영업/출고

#### sales_orders (판매 주문)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| order_number | varchar(50) | NOT NULL | 주문 번호 |
| partner_id | uuid | NOT NULL, FK → partners(id) | 고객 |
| order_date | date | NOT NULL | |
| status | varchar(20) | NOT NULL DEFAULT 'draft' | draft, confirmed, shipped, cancelled |
| total_amount | numeric(18,2) | NOT NULL DEFAULT 0 | 매출 금액 |
| notes | text | | |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, order_number)`
- CHECK: `status IN ('draft', 'confirmed', 'shipped', 'cancelled')`

#### sales_order_lines (판매 라인)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| sales_order_id | uuid | NOT NULL, FK → sales_orders(id) ON DELETE CASCADE | |
| item_id | uuid | NOT NULL, FK → items(id) | |
| warehouse_id | uuid | NOT NULL, FK → warehouses(id) | 출고 창고 |
| quantity | numeric(15,4) | NOT NULL | 출고 수량 |
| unit_price | numeric(18,4) | NOT NULL | 판매 단가 |
| line_amount | numeric(18,2) | NOT NULL | 매출 금액 |
| cost_of_goods | numeric(18,2) | | 매출 원가 (FIFO 계산 결과) |

- CHECK: `quantity > 0`
- CHECK: `unit_price >= 0`

---

### 그룹 G: 창고 간 이동

#### warehouse_transfers (이동 전표)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| company_id | uuid | NOT NULL, FK → companies(id) | |
| transfer_number | varchar(50) | NOT NULL | 이동 번호 |
| from_warehouse_id | uuid | NOT NULL, FK → warehouses(id) | 출발 창고 |
| to_warehouse_id | uuid | NOT NULL, FK → warehouses(id) | 도착 창고 |
| transfer_date | date | NOT NULL | |
| status | varchar(20) | NOT NULL DEFAULT 'completed' | completed, cancelled |
| notes | text | | |
| created_by | uuid | FK → profiles(id) | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

- UNIQUE: `(company_id, transfer_number)`
- CHECK: `from_warehouse_id != to_warehouse_id`

#### warehouse_transfer_lines (이동 라인)
| 컬럼 | 타입 | 제약조건 | 설명 |
|------|------|----------|------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| transfer_id | uuid | NOT NULL, FK → warehouse_transfers(id) ON DELETE CASCADE | |
| item_id | uuid | NOT NULL, FK → items(id) | |
| quantity | numeric(15,4) | NOT NULL | 이동 수량 |
| unit_cost | numeric(18,4) | | FIFO 기준 이동 원가 |

- CHECK: `quantity > 0`

> **창고 이동 처리**: 출발지에서 FIFO 로트 소비 → 도착지에 동일 단가로 새 lot 생성

---

## 핵심 DB Functions

### consume_inventory (FIFO/LIFO 로트 소비)
```sql
-- 의사코드 (실제 구현은 마이그레이션에서)
CREATE OR REPLACE FUNCTION consume_inventory(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_transaction_id uuid
) RETURNS numeric AS $$
DECLARE
  v_lot RECORD;
  v_remaining numeric := p_qty;
  v_total_cost numeric := 0;
  v_consume numeric;
  v_costing_method varchar;
BEGIN
  -- 회사의 원가 계산 방식 조회
  SELECT costing_method INTO v_costing_method
  FROM companies WHERE id = p_company_id;

  -- FIFO/LIFO에 따라 정렬 방향 결정
  FOR v_lot IN
    SELECT id, remaining_qty, unit_cost
    FROM inventory_lots
    WHERE company_id = p_company_id
      AND item_id = p_item_id
      AND warehouse_id = p_warehouse_id
      AND remaining_qty > 0
    ORDER BY
      CASE WHEN v_costing_method = 'LIFO' THEN lot_date END DESC,
      CASE WHEN v_costing_method != 'LIFO' THEN lot_date END ASC
    FOR UPDATE  -- 동시성 잠금
  LOOP
    IF v_remaining <= 0 THEN EXIT; END IF;

    v_consume := LEAST(v_lot.remaining_qty, v_remaining);

    -- 로트 잔여 수량 차감
    UPDATE inventory_lots
    SET remaining_qty = remaining_qty - v_consume
    WHERE id = v_lot.id;

    -- 소비 이력 기록
    INSERT INTO inventory_lot_consumptions (lot_id, consumed_qty, transaction_id)
    VALUES (v_lot.id, v_consume, p_transaction_id);

    v_total_cost := v_total_cost + (v_consume * v_lot.unit_cost);
    v_remaining := v_remaining - v_consume;
  END LOOP;

  -- 수량 부족 시 롤백
  IF v_remaining > 0 THEN
    RAISE EXCEPTION '재고 부족: item_id=%, warehouse_id=%, 부족 수량=%',
      p_item_id, p_warehouse_id, v_remaining;
  END IF;

  -- inventory_summary 갱신
  UPDATE inventory_summary
  SET total_qty = total_qty - p_qty,
      total_value = total_value - v_total_cost,
      updated_at = now()
  WHERE company_id = p_company_id
    AND item_id = p_item_id
    AND warehouse_id = p_warehouse_id;

  RETURN v_total_cost;
END;
$$ LANGUAGE plpgsql;
```

### Weighted Average 처리
```
가중평균 단가 = inventory_summary.total_value / inventory_summary.total_qty
출고 원가 = 가중평균 단가 × 출고 수량
로트는 여전히 기록하되, 소비 시 가중평균 단가를 사용
```

---

## RLS 정책 패턴

모든 비즈니스 테이블에 동일 패턴 적용:

```sql
-- 테넌트 격리 (일반 사용자)
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "{table_name}_tenant_isolation" ON {table_name}
  USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- super_admin 전체 접근
CREATE POLICY "{table_name}_super_admin" ON {table_name}
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin');
```

---

## 테이블 요약

| # | 테이블 | 그룹 | 핵심 역할 |
|---|--------|------|-----------|
| 1 | companies | A | 회사 (멀티테넌시 루트) |
| 2 | profiles | A | 사용자 (auth 연동) |
| 3 | partners | B | 거래처 |
| 4 | warehouses | B | 창고 |
| 5 | items | B | 품목 |
| 6 | bom_headers | B | BOM 정의 |
| 7 | bom_lines | B | BOM 재료 |
| 8 | purchase_orders | C | 발주서 |
| 9 | purchase_order_lines | C | 발주 라인 |
| 10 | goods_receipts | C | 입고 |
| 11 | goods_receipt_lines | C | 입고 라인 |
| 12 | po_payments | C | PO 지급 |
| 13 | inventory_lots | D | **FIFO 로트 추적** |
| 14 | inventory_lot_consumptions | D | 로트 소비 이력 |
| 15 | inventory_summary | D | 현재고 캐시 |
| 16 | inventory_transactions | D | 재고 변동 감사 |
| 17 | assembly_orders | E | 조립 지시 |
| 18 | assembly_order_lines | E | 조립 재료 |
| 19 | sales_orders | F | 판매 주문 |
| 20 | sales_order_lines | F | 판매 라인 |
| 21 | warehouse_transfers | G | 창고 이동 |
| 22 | warehouse_transfer_lines | G | 이동 라인 |
