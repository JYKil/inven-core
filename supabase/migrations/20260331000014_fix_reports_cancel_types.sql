-- 보고서 RPC 수정: cancel 트랜잭션 타입 집계 반영
--
-- 변경 사항:
-- 1. report_inventory_ledger: cancel 타입을 원본 방향에서 상계 (입고취소→입고 차감, 출고취소→출고 차감)
-- 2. report_sales: 출고 취소 시 SO가 confirmed로 복귀하므로 기존 status='shipped' 필터로 자동 제외됨 → 수정 불필요
-- 3. dashboard_summary: 동일한 이유로 수정 불필요

-- ══════════════════════════════════════════════════════════
-- 1. report_inventory_ledger — cancel 타입 상계 처리
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION report_inventory_ledger(
  p_company_id uuid,
  p_start_date date,
  p_end_date date,
  p_item_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  WITH filtered_items AS (
    SELECT DISTINCT it.item_id, it.warehouse_id
    FROM inventory_transactions it
    WHERE it.company_id = p_company_id
      AND (p_item_id IS NULL OR it.item_id = p_item_id)
      AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
  ),
  opening_balance AS (
    SELECT fi.item_id, fi.warehouse_id,
           COALESCE(SUM(it.quantity), 0) AS qty,
           COALESCE(SUM(CASE WHEN it.quantity > 0 THEN it.total_cost ELSE -it.total_cost END), 0) AS value
    FROM filtered_items fi
    LEFT JOIN inventory_transactions it
      ON it.company_id = p_company_id
      AND it.item_id = fi.item_id
      AND it.warehouse_id = fi.warehouse_id
      AND it.transaction_date < p_start_date::timestamptz
    GROUP BY fi.item_id, fi.warehouse_id
  ),
  period_agg AS (
    -- 기간 내 품목/창고별 합계
    -- cancel 타입은 원본 방향에서 상계 (입고취소→입고 차감, 출고취소→출고 차감)
    SELECT it.item_id, it.warehouse_id,
           -- 입고 계열: purchase_in, assembly_in, transfer_in + 해당 cancel (음수이므로 자연 상계)
           GREATEST(0, COALESCE(SUM(CASE
             WHEN it.transaction_type IN ('purchase_in','purchase_in_cancel','assembly_in','assembly_in_cancel','transfer_in','transfer_in_cancel')
             THEN it.quantity ELSE 0 END), 0)) AS total_in_qty,
           -- 출고 계열: sale_out, assembly_out, transfer_out + 해당 cancel (양수이므로 자연 상계)
           GREATEST(0, ABS(COALESCE(SUM(CASE
             WHEN it.transaction_type IN ('sale_out','sale_out_cancel','assembly_out','assembly_out_cancel','transfer_out','transfer_out_cancel')
             THEN it.quantity ELSE 0 END), 0))) AS total_out_qty,
           COALESCE(SUM(it.quantity), 0) AS net_qty
    FROM inventory_transactions it
    WHERE it.company_id = p_company_id
      AND it.transaction_date >= p_start_date::timestamptz
      AND it.transaction_date < (p_end_date + 1)::timestamptz
      AND (p_item_id IS NULL OR it.item_id = p_item_id)
      AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
    GROUP BY it.item_id, it.warehouse_id
  ),
  period_transactions AS (
    SELECT it.item_id, it.warehouse_id,
           it.transaction_type,
           it.quantity,
           it.total_cost,
           it.transaction_date,
           it.reference_type,
           it.reference_id,
           i.code AS item_code,
           i.name AS item_name,
           w.name AS warehouse_name
    FROM inventory_transactions it
    JOIN items i ON i.id = it.item_id
    JOIN warehouses w ON w.id = it.warehouse_id
    WHERE it.company_id = p_company_id
      AND it.transaction_date >= p_start_date::timestamptz
      AND it.transaction_date < (p_end_date + 1)::timestamptz
      AND (p_item_id IS NULL OR it.item_id = p_item_id)
      AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
    ORDER BY it.item_id, it.warehouse_id, it.transaction_date
  ),
  summary AS (
    SELECT fi.item_id, fi.warehouse_id,
           i.code AS item_code, i.name AS item_name, w.name AS warehouse_name,
           COALESCE(ob.qty, 0) AS opening_qty,
           COALESCE(ob.value, 0) AS opening_value,
           COALESCE(pa.total_in_qty, 0) AS total_in_qty,
           COALESCE(pa.total_out_qty, 0) AS total_out_qty,
           COALESCE(ob.qty, 0) + COALESCE(pa.net_qty, 0) AS closing_qty
    FROM filtered_items fi
    JOIN items i ON i.id = fi.item_id
    JOIN warehouses w ON w.id = fi.warehouse_id
    LEFT JOIN opening_balance ob
      ON ob.item_id = fi.item_id AND ob.warehouse_id = fi.warehouse_id
    LEFT JOIN period_agg pa
      ON pa.item_id = fi.item_id AND pa.warehouse_id = fi.warehouse_id
    WHERE COALESCE(ob.qty, 0) != 0 OR COALESCE(pa.net_qty, 0) != 0
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'summary', COALESCE((SELECT jsonb_agg(row_to_json(s) ORDER BY s.item_code, s.warehouse_name) FROM summary s), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(row_to_json(pt)) FROM period_transactions pt), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
