# Phase 6: 롤백/정정 트랜잭션 RPC 설계

## 상태
- [x] 설계 완료
- [x] DB 마이그레이션 구현 (20260331000008_cancel_columns.sql)
- [x] 공통 유틸 함수 구현 (20260331000009_rpc_restore_lot_consumptions.sql)
- [x] RPC 4종 구현 (cancel_shipment / cancel_goods_receipt / cancel_transfer / cancel_assembly)
- [x] API Route 4종 구현
- [x] UI 구현 (CancelDialog + 뮤테이션 훅 + 상세 페이지 4종)
- [x] 입고 상세 페이지 신규 생성 (goods-receipts/[id]/page.tsx)
- [x] DB push + 타입 재생성 + TypeScript/Next.js 빌드 통과
- [x] 보고서 RPC 수정 (cancel 타입 집계)

## 설계 원칙

### 1. 역분개(Reverse Entry) 방식 채택
물리적 삭제가 아닌 **역방향 트랜잭션**을 생성하는 방식.
- 감사 추적(audit trail) 보존 — 원본 + 취소 트랜잭션 모두 기록
- `inventory_transactions`에 역방향 레코드 추가 (quantity 부호 반전)
- 원본 문서 상태를 `cancelled`로 변경

### 2. 취소 가능 조건 (공통)
| 조건 | 설명 |
|------|------|
| 이미 취소된 문서 | 중복 취소 불가 (`status != 'cancelled'`) |
| 후속 트랜잭션 존재 | 해당 로트가 이미 소비된 경우 취소 불가 |
| 동일 company_id | RLS + 명시적 검증 |

### 3. 후속 소비 검증 — 핵심 안전장치
입고/조립/이동으로 생성된 로트가 이후 출고/조립/이동에 소비되었으면,
해당 트랜잭션을 단순 취소할 수 없다 (연쇄 롤백 필요).

**전략**: 1단계에서는 **후속 소비가 없는 경우만 취소 허용**.
연쇄 롤백은 복잡도가 높아 2단계로 연기.

```
후속 소비 검증 쿼리:
SELECT SUM(remaining_qty) < SUM(initial_qty) AS has_consumptions
FROM inventory_lots
WHERE source_id = <원본_라인_id> AND source_type = <타입>;

→ initial_qty != remaining_qty 이면 일부 소비됨 → 취소 불가
```

---

## RPC 함수 설계

### 1. cancel_goods_receipt (입고 취소)

**시그니처**:
```sql
CREATE OR REPLACE FUNCTION cancel_goods_receipt(
  p_goods_receipt_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

**전제 조건**:
- goods_receipts.status = 'confirmed' (이미 취소면 에러)
- 해당 입고로 생성된 로트가 소비되지 않았어야 함 (remaining_qty = initial_qty)

**처리 흐름**:
```
1. goods_receipts 조회 (FOR UPDATE)
   → status 확인, company_id 확인

2. 각 goods_receipt_lines 순회:
   a. 해당 라인이 생성한 lot 조회
      → source_type='purchase', source_id=line_id
   b. 후속 소비 검증
      → remaining_qty < initial_qty 이면 RAISE EXCEPTION
   c. inventory_lots.remaining_qty = 0 으로 설정
      (또는 is_cancelled = true 마킹)
   d. inventory_summary 차감:
      → total_qty -= initial_qty
      → total_value -= (initial_qty × unit_cost)
   e. inventory_transactions 역분개 INSERT:
      → type = 'purchase_in_cancel'
      → quantity = -(원본 수량)  -- 음수
      → reference_type = 'goods_receipt_cancel'
      → reference_id = goods_receipt_id
   f. purchase_order_lines.received_qty 차감 (PO 연결된 경우)

3. PO 상태 재계산 (PO 연결된 경우):
   → 모든 라인 received_qty=0 이면 status='confirmed'
   → 일부 > 0 이면 status='partially_received'

4. goods_receipts.status = 'cancelled'
   goods_receipts.cancelled_at = now()
   goods_receipts.cancel_reason = p_reason

5. RETURN jsonb_build_object(
     'success', true,
     'cancelled_lines', 라인 수,
     'restored_qty', 복원된 총 수량
   )
```

**에러 케이스**:
| 에러 | 메시지 |
|------|--------|
| 문서 없음 | `입고 문서를 찾을 수 없습니다` |
| 이미 취소 | `이미 취소된 입고입니다` |
| 로트 소비됨 | `품목 "X"의 입고 로트가 이미 사용되었습니다. 해당 출고/조립/이동을 먼저 취소하세요` |

---

### 2. cancel_shipment (출고 취소)

**시그니처**:
```sql
CREATE OR REPLACE FUNCTION cancel_shipment(
  p_sales_order_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

**전제 조건**:
- sales_orders.status = 'shipped'

**처리 흐름**:
```
1. sales_orders 조회 (FOR UPDATE)
   → status='shipped' 확인

2. 해당 SO의 inventory_transactions 조회
   → reference_type='sales_order', reference_id=SO.id, type='sale_out'

3. 각 출고 트랜잭션별 처리:
   a. inventory_lot_consumptions 조회
      → transaction_id = 해당 트랜잭션
   b. 각 consumption별 로트 복원:
      → inventory_lots.remaining_qty += consumed_qty
   c. inventory_lot_consumptions 삭제 (또는 is_cancelled 마킹)
   d. inventory_summary 복원:
      → total_qty += 출고수량
      → total_value += 소비원가 (consumption.consumed_qty × lot.unit_cost)
   e. inventory_transactions 역분개 INSERT:
      → type = 'sale_out_cancel'
      → quantity = +(원본 출고수량의 절대값)  -- 양수 (복원)
      → reference_type = 'sales_order_cancel'

4. sales_order_lines.cost_of_goods = 0 (또는 NULL)

5. sales_orders.status = 'confirmed' (출고 전 상태로 복원)
   sales_orders.cancelled_shipment_at = now()
   sales_orders.cancel_reason = p_reason

6. RETURN jsonb_build_object(
     'success', true,
     'restored_lots', 복원된 로트 수,
     'restored_qty', 복원된 총 수량
   )
```

**특이사항**:
- 출고 취소는 **로트 복원**이 핵심 — consume_inventory의 역연산
- `inventory_lot_consumptions` 테이블이 정확한 복원 데이터를 제공
- 출고 취소 후 SO 상태는 `confirmed`로 돌아감 (재출고 가능)

---

### 3. cancel_assembly (조립 취소)

**시그니처**:
```sql
CREATE OR REPLACE FUNCTION cancel_assembly(
  p_assembly_order_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

**전제 조건**:
- assembly_orders.status = 'completed'
- 조립 결과물 로트가 소비되지 않았어야 함 (remaining_qty = initial_qty)

**처리 흐름**:
```
1. assembly_orders 조회 (FOR UPDATE)

2. 결과물 로트 후속 소비 검증:
   → source_type='assembly', source_id 관련 로트
   → remaining_qty < initial_qty 이면 RAISE EXCEPTION

3. 결과물 로트 제거:
   a. inventory_lots.remaining_qty = 0 (또는 is_cancelled)
   b. inventory_summary 차감 (결과물):
      → total_qty -= 조립수량
      → total_value -= total_cost
   c. inventory_transactions 역분개:
      → type = 'assembly_in_cancel', quantity = -(조립수량)

4. 재료 로트 복원 (각 assembly_order_lines):
   a. 해당 라인의 inventory_transactions 조회
      → type='assembly_out'
   b. inventory_lot_consumptions 조회 → 로트별 복원
      → inventory_lots.remaining_qty += consumed_qty
   c. inventory_lot_consumptions 삭제
   d. inventory_summary 복원 (재료):
      → total_qty += consumed_qty
      → total_value += (consumed_qty × lot.unit_cost)
   e. inventory_transactions 역분개:
      → type = 'assembly_out_cancel', quantity = +(소비량)

5. assembly_orders.status = 'cancelled'
   assembly_orders.cancelled_at = now()
   assembly_orders.cancel_reason = p_reason

6. RETURN jsonb_build_object(...)
```

**특이사항**:
- 조립은 **양방향** — 재료 소비 복원 + 결과물 로트 제거
- 결과물 로트가 이미 출고/이동/재조립에 사용되었으면 취소 불가
- 재료 복원은 출고 취소와 동일한 패턴 (lot_consumptions 역추적)

---

### 4. cancel_transfer (창고 이동 취소)

**시그니처**:
```sql
CREATE OR REPLACE FUNCTION cancel_transfer(
  p_warehouse_transfer_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
```

**전제 조건**:
- warehouse_transfers.status = 'completed'
- 도착지 로트가 소비되지 않았어야 함

**처리 흐름**:
```
1. warehouse_transfers 조회 (FOR UPDATE)

2. 각 warehouse_transfer_lines 순회:

   [도착지 로트 제거]
   a. 도착지 로트 조회
      → source_type='transfer_in', source_id=line_id
   b. 후속 소비 검증
      → remaining_qty < initial_qty 이면 RAISE EXCEPTION
   c. inventory_lots.remaining_qty = 0
   d. inventory_summary 차감 (도착지):
      → total_qty -= 이동수량
      → total_value -= (이동수량 × unit_cost)
   e. inventory_transactions 역분개:
      → type = 'transfer_in_cancel', quantity = -(이동수량)

   [출발지 로트 복원]
   f. 출발지 inventory_transactions 조회
      → type='transfer_out', reference_id=transfer_id
   g. inventory_lot_consumptions → 로트별 복원
      → inventory_lots.remaining_qty += consumed_qty
   h. inventory_lot_consumptions 삭제
   i. inventory_summary 복원 (출발지):
      → total_qty += 이동수량
      → total_value += 소비원가
   j. inventory_transactions 역분개:
      → type = 'transfer_out_cancel', quantity = +(이동수량)

3. warehouse_transfers.status = 'cancelled'
   warehouse_transfers.cancelled_at = now()
   warehouse_transfers.cancel_reason = p_reason

4. RETURN jsonb_build_object(...)
```

---

## 공통 유틸리티 함수

### restore_lot_consumptions (로트 소비 복원)

출고/조립/이동 취소에서 공통으로 사용하는 로트 복원 로직.

```sql
CREATE OR REPLACE FUNCTION restore_lot_consumptions(
  p_transaction_id UUID,
  p_company_id UUID
) RETURNS TABLE(lot_id UUID, restored_qty NUMERIC, unit_cost NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER
```

**처리**:
```
1. inventory_lot_consumptions 조회 WHERE transaction_id = p_transaction_id
2. 각 consumption:
   a. inventory_lots.remaining_qty += consumed_qty (FOR UPDATE)
   b. 반환: lot_id, restored_qty, unit_cost
3. inventory_lot_consumptions 삭제 WHERE transaction_id = p_transaction_id
```

이 함수를 사용하면 cancel_shipment, cancel_assembly, cancel_transfer에서
로트 복원 코드 중복을 제거할 수 있다.

---

## 새로 추가할 트랜잭션 타입

`inventory_transactions.transaction_type` 확장:

| 기존 타입 | 취소 타입 | 설명 |
|----------|----------|------|
| `purchase_in` | `purchase_in_cancel` | 입고 취소 (음수) |
| `sale_out` | `sale_out_cancel` | 출고 취소 (양수 — 복원) |
| `assembly_in` | `assembly_in_cancel` | 조립 결과물 취소 (음수) |
| `assembly_out` | `assembly_out_cancel` | 조립 재료 복원 (양수) |
| `transfer_in` | `transfer_in_cancel` | 이동 도착 취소 (음수) |
| `transfer_out` | `transfer_out_cancel` | 이동 출발 복원 (양수) |

---

## DB 스키마 변경 (마이그레이션)

### 문서 테이블 공통 컬럼 추가

각 트랜잭션 헤더 테이블에 취소 관련 컬럼 추가:

```sql
-- goods_receipts
ALTER TABLE goods_receipts 
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;

-- sales_orders (출고 취소용 — status는 이미 존재)
ALTER TABLE sales_orders
  ADD COLUMN cancelled_shipment_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;

-- assembly_orders
ALTER TABLE assembly_orders
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;

-- warehouse_transfers
ALTER TABLE warehouse_transfers
  ADD COLUMN cancelled_at TIMESTAMPTZ,
  ADD COLUMN cancel_reason TEXT;
```

### inventory_lot_consumptions 인덱스 보강

취소 시 transaction_id 기반 조회가 핵심:
```sql
-- 이미 존재: idx_lot_consumptions_txn_id (transaction_id)
-- 추가 필요 없음, 기존 인덱스로 충분
```

---

## API Route 설계

| 엔드포인트 | 메서드 | RPC | 권한 |
|-----------|--------|-----|------|
| `/api/goods-receipts/[id]/cancel` | POST | cancel_goods_receipt | company_admin, normal |
| `/api/sales-orders/[id]/cancel-shipment` | POST | cancel_shipment | company_admin, normal |
| `/api/assembly-orders/[id]/cancel` | POST | cancel_assembly | company_admin, normal |
| `/api/warehouse-transfers/[id]/cancel` | POST | cancel_transfer | company_admin, normal |

**Request Body** (공통):
```json
{
  "reason": "사유 텍스트 (선택)"
}
```

**Response** (공통):
```json
{
  "success": true,
  "cancelled_lines": 3,
  "restored_qty": 150.0000
}
```

---

## UI 설계

### 취소 버튼 위치
각 상세 페이지의 헤더 영역에 "취소" 버튼 추가:

| 페이지 | 버튼 표시 조건 | 버튼 텍스트 |
|--------|--------------|-----------|
| 입고 상세 | status='confirmed' | "입고 취소" |
| 판매주문 상세 | status='shipped' | "출고 취소" |
| 조립 상세 | status='completed' | "조립 취소" |
| 이동 상세 | status='completed' | "이동 취소" |

### 취소 확인 다이얼로그
- AlertDialog 사용 (DESIGN.md 파괴적 액션 패턴)
- 사유 입력 필드 (선택)
- "이 작업은 되돌릴 수 없습니다" 경고 메시지
- 취소 불가 시 에러 메시지 표시: "이미 사용된 재고가 있어 취소할 수 없습니다"

### 취소된 문서 표시
- 목록에서 StatusBadge `cancelled` 표시 (회색 배지)
- 상세 페이지에서 취소 사유 + 취소 일시 표시
- 취소된 문서는 수정/재실행 불가 (읽기 전용)

---

## 데이터 정합성 검증

### 취소 후 검증 쿼리 (RPC 내부에서 실행)
```sql
-- inventory_summary와 lots 합계 일치 검증
DO $$
DECLARE
  v_lot_sum RECORD;
  v_summary RECORD;
BEGIN
  SELECT SUM(remaining_qty) as qty, SUM(remaining_qty * unit_cost) as val
  INTO v_lot_sum
  FROM inventory_lots
  WHERE company_id = p_company_id 
    AND item_id = <해당 품목>
    AND warehouse_id = <해당 창고>;
  
  SELECT total_qty, total_value INTO v_summary
  FROM inventory_summary
  WHERE company_id = p_company_id
    AND item_id = <해당 품목>
    AND warehouse_id = <해당 창고>;
  
  IF ABS(v_lot_sum.qty - v_summary.total_qty) > 0.0001 THEN
    RAISE EXCEPTION '정합성 오류: lots 합계(%)와 summary(%)가 불일치',
      v_lot_sum.qty, v_summary.total_qty;
  END IF;
END $$;
```

이 검증은 개발/테스트 단계에서 활성화하고, 프로덕션에서는 성능 고려하여 선택적 적용.

---

## 구현 우선순위

| 순서 | RPC | 복잡도 | 이유 |
|------|-----|--------|------|
| 1 | `cancel_shipment` | ★★☆ | 가장 빈번, 로트 복원만 (생성 없음) |
| 2 | `cancel_goods_receipt` | ★★☆ | 로트 제거만 (복원 없음), PO 상태 롤백 |
| 3 | `cancel_transfer` | ★★★ | 양방향 (출발지 복원 + 도착지 제거) |
| 4 | `cancel_assembly` | ★★★ | 양방향 + 원가 역계산 |

공통 함수 `restore_lot_consumptions`를 먼저 구현하면 2~4가 간결해진다.

---

## 2단계 확장 (연쇄 롤백 — 미래)

현재 설계는 "후속 소비 없는 경우만 취소 가능". 2단계에서 고려할 사항:

1. **연쇄 취소**: 입고 로트가 출고에 사용된 경우 → 출고 먼저 취소 → 입고 취소
   - UI에서 "의존 트랜잭션 목록" 표시 → 순서대로 취소 안내
2. **부분 취소**: 입고 3개 라인 중 1개만 취소
3. **정정 트랜잭션**: 취소 + 재입고를 하나의 워크플로로 (수량/단가 수정)
4. **재고 조정(Adjustment)**: 실사 기반 수량 보정 (inventory_adjustment 별도 RPC)

---

## 보고서 영향

취소 트랜잭션은 `inventory_transactions`에 기록되므로:
- **수불부**: `*_cancel` 타입도 별도 행으로 표시 (입고 취소/출고 취소 등)
- **report_inventory_ledger RPC** 수정 필요: cancel 타입을 적절한 방향으로 집계
- **매출 보고서**: 출고 취소 시 매출액/원가에서 차감

---

## 테스트 시나리오

### cancel_goods_receipt
1. 정상 취소 — 미소비 로트, inventory_summary 차감 확인
2. 이미 취소된 문서 → 에러
3. 로트가 출고에 소비됨 → 에러 (취소 불가)
4. PO 연결된 입고 취소 → received_qty 복원, PO 상태 롤백
5. 여러 라인 입고 취소 → 각 라인별 로트/summary 정확히 차감

### cancel_shipment
1. 정상 취소 — 로트 remaining_qty 복원, inventory_summary 복원
2. FIFO 다중 로트 소비 → 각 로트 정확히 복원
3. 이미 취소/confirmed 상태 → 에러
4. 취소 후 재출고 가능 확인

### cancel_assembly
1. 정상 취소 — 재료 로트 복원 + 결과물 로트 제거
2. 결과물이 이미 출고됨 → 에러
3. 재료 복원 후 inventory_summary 정합성 확인

### cancel_transfer
1. 정상 취소 — 출발지 로트 복원 + 도착지 로트 제거
2. 도착지 로트가 이미 출고됨 → 에러
3. 출발지/도착지 inventory_summary 양쪽 모두 정확히 복원
