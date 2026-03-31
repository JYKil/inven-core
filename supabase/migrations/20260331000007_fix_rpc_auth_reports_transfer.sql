-- 슬라이스 5 리뷰 수정 사항
-- [C1] 보고서/대시보드 RPC에 auth.uid() 검증 추가 (SECURITY DEFINER 타회사 접근 방지)
-- [C2] 수불부 — 기간 내 미변동 품목 누락 수정 (filtered_items 기준 LEFT JOIN)
-- [I1] execute_transfer lot_date: now() → p_transfer_date
-- [I2] dashboard_summary 타임존: current_date → Asia/Seoul
-- [I3] execute_transfer 중복 item_id 검증

-- ══════════════════════════════════════════════════════════
-- 1. execute_transfer — lot_date 수정 + 중복 item_id 검증
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION execute_transfer(
  p_company_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_transfer_date date,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
  v_transfer_number varchar(50);
  v_line jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_txn_out_id uuid;
  v_txn_in_id uuid;
  v_cost numeric;
  v_unit_cost numeric;
  v_lot_id uuid;
  v_total_lines int := 0;
BEGIN
  -- 출발지/도착지 동일 검증
  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RAISE EXCEPTION '출발 창고와 도착 창고가 동일합니다';
  END IF;

  -- 라인 비어있으면 에러
  IF jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION '이동할 품목이 없습니다';
  END IF;

  -- [I3] 중복 item_id 검증
  IF (SELECT count(*) FROM jsonb_array_elements(p_lines)) !=
     (SELECT count(DISTINCT elem->>'item_id') FROM jsonb_array_elements(p_lines) elem) THEN
    RAISE EXCEPTION '동일 품목이 중복되어 있습니다';
  END IF;

  -- 이동 번호 생성 (TRF-YYYYMMDD-NNN)
  SELECT 'TRF-' || to_char(p_transfer_date, 'YYYYMMDD') || '-' ||
         lpad((count(*) + 1)::text, 3, '0')
  INTO v_transfer_number
  FROM warehouse_transfers
  WHERE company_id = p_company_id
    AND transfer_date = p_transfer_date;

  -- 이동 전표 생성
  INSERT INTO warehouse_transfers (
    company_id, transfer_number, from_warehouse_id, to_warehouse_id,
    transfer_date, status, notes, created_by
  ) VALUES (
    p_company_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
    p_transfer_date, 'completed', p_notes, p_created_by
  )
  RETURNING id INTO v_transfer_id;

  -- 각 라인별 처리 (item_id 순서로 데드락 방지)
  FOR v_line IN
    SELECT * FROM jsonb_array_elements(p_lines) elem
    ORDER BY (elem->>'item_id')::uuid
  LOOP
    v_item_id := (v_line->>'item_id')::uuid;
    v_quantity := (v_line->>'quantity')::numeric;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION '이동 수량은 0보다 커야 합니다';
    END IF;

    -- 1. 출발지 출고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, created_by
    ) VALUES (
      p_company_id, v_item_id, p_from_warehouse_id,
      'transfer_out', -v_quantity, NULL, NULL,
      'transfer', v_transfer_id,
      p_transfer_date, p_created_by
    )
    RETURNING id INTO v_txn_out_id;

    -- 2. FIFO 로트 소비 (출발지)
    v_cost := consume_inventory(
      p_company_id, v_item_id, p_from_warehouse_id,
      v_quantity, v_txn_out_id
    );

    v_unit_cost := v_cost / v_quantity;

    -- 출고 트랜잭션에 원가 기록
    UPDATE inventory_transactions
    SET unit_cost = v_unit_cost,
        total_cost = v_cost
    WHERE id = v_txn_out_id;

    -- 3. 도착지 입고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, created_by
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      'transfer_in', v_quantity, v_unit_cost, v_cost,
      'transfer', v_transfer_id,
      p_transfer_date, p_created_by
    )
    RETURNING id INTO v_txn_in_id;

    -- 4. 도착지에 새 lot 생성 ([I1] p_transfer_date 사용 — FIFO 순서 보존)
    INSERT INTO inventory_lots (
      company_id, item_id, warehouse_id,
      lot_date, unit_cost, initial_qty, remaining_qty,
      source_type, source_id
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      p_transfer_date, v_unit_cost, v_quantity, v_quantity,
      'transfer_in', v_transfer_id
    )
    RETURNING id INTO v_lot_id;

    -- 5. 도착지 inventory_summary UPSERT
    INSERT INTO inventory_summary (
      company_id, item_id, warehouse_id,
      total_qty, total_value
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      v_quantity, v_cost
    )
    ON CONFLICT (company_id, item_id, warehouse_id)
    DO UPDATE SET
      total_qty = inventory_summary.total_qty + v_quantity,
      total_value = inventory_summary.total_value + v_cost,
      updated_at = now();

    -- 6. 이동 라인 기록
    INSERT INTO warehouse_transfer_lines (
      transfer_id, item_id, quantity, unit_cost
    ) VALUES (
      v_transfer_id, v_item_id, v_quantity, v_unit_cost
    );

    v_total_lines := v_total_lines + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_number,
    'total_lines', v_total_lines
  );
END;
$$;


-- ══════════════════════════════════════════════════════════
-- 2. report_inventory_ledger — [C1] auth 검증 + [C2] 미변동 품목 포함
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
  -- [C1] 호출자가 해당 회사 소속인지 검증
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
    SELECT it.item_id, it.warehouse_id,
           COALESCE(SUM(CASE WHEN it.quantity > 0 THEN it.quantity ELSE 0 END), 0) AS total_in_qty,
           COALESCE(SUM(CASE WHEN it.quantity < 0 THEN ABS(it.quantity) ELSE 0 END), 0) AS total_out_qty,
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
  -- [C2] filtered_items 기준으로 LEFT JOIN — 미변동 품목도 포함
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
    -- 기초 잔량이 있거나 기간 내 이동이 있는 경우만 표시
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


-- ══════════════════════════════════════════════════════════
-- 3. report_warehouse_stock — [C1] auth 검증 추가
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION report_warehouse_stock(
  p_company_id uuid,
  p_warehouse_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- [C1] 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      w.id AS warehouse_id,
      w.code AS warehouse_code,
      w.name AS warehouse_name,
      i.id AS item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      s.total_qty,
      s.total_value,
      CASE WHEN s.total_qty > 0
        THEN ROUND(s.total_value / s.total_qty, 4)
        ELSE 0
      END AS avg_unit_cost
    FROM inventory_summary s
    JOIN items i ON i.id = s.item_id
    JOIN warehouses w ON w.id = s.warehouse_id
    WHERE s.company_id = p_company_id
      AND s.total_qty > 0
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
    ORDER BY w.name, i.code
  ) r;

  RETURN v_result;
END;
$$;


-- ══════════════════════════════════════════════════════════
-- 4. report_sales — [C1] auth 검증 추가
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION report_sales(
  p_company_id uuid,
  p_start_date date,
  p_end_date date,
  p_partner_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- [C1] 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  WITH sales_data AS (
    SELECT
      so.id AS sales_order_id,
      so.order_number,
      so.order_date,
      p.name AS partner_name,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      sol.quantity,
      sol.unit_price,
      sol.line_amount,
      COALESCE(sol.cost_of_goods, 0) AS cost_of_goods,
      sol.line_amount - COALESCE(sol.cost_of_goods, 0) AS gross_profit
    FROM sales_orders so
    JOIN sales_order_lines sol ON sol.sales_order_id = so.id
    JOIN partners p ON p.id = so.partner_id
    JOIN items i ON i.id = sol.item_id
    WHERE so.company_id = p_company_id
      AND so.status = 'shipped'
      AND so.order_date >= p_start_date
      AND so.order_date <= p_end_date
      AND (p_partner_id IS NULL OR so.partner_id = p_partner_id)
    ORDER BY so.order_date, so.order_number
  ),
  totals AS (
    SELECT
      COALESCE(SUM(line_amount), 0) AS total_revenue,
      COALESCE(SUM(cost_of_goods), 0) AS total_cogs,
      COALESCE(SUM(gross_profit), 0) AS total_profit,
      COALESCE(SUM(quantity), 0) AS total_quantity,
      COUNT(DISTINCT sales_order_id) AS order_count
    FROM sales_data
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'totals', (SELECT row_to_json(t) FROM totals t),
    'profit_margin', CASE
      WHEN (SELECT total_revenue FROM totals) > 0
      THEN ROUND((SELECT total_profit FROM totals) / (SELECT total_revenue FROM totals) * 100, 1)
      ELSE 0
    END,
    'lines', COALESCE((SELECT jsonb_agg(row_to_json(sd)) FROM sales_data sd), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;


-- ══════════════════════════════════════════════════════════
-- 5. dashboard_reorder_alerts — [C1] auth 검증 추가
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION dashboard_reorder_alerts(
  p_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- [C1] 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      i.id AS item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      i.min_stock_qty,
      COALESCE(SUM(s.total_qty), 0) AS current_qty,
      i.min_stock_qty - COALESCE(SUM(s.total_qty), 0) AS shortage_qty
    FROM items i
    LEFT JOIN inventory_summary s
      ON s.item_id = i.id AND s.company_id = i.company_id
    WHERE i.company_id = p_company_id
      AND i.is_active = true
      AND i.min_stock_qty > 0
    GROUP BY i.id, i.code, i.name, i.unit, i.min_stock_qty
    HAVING COALESCE(SUM(s.total_qty), 0) < i.min_stock_qty
    ORDER BY (i.min_stock_qty - COALESCE(SUM(s.total_qty), 0)) DESC
  ) r;

  RETURN v_result;
END;
$$;


-- ══════════════════════════════════════════════════════════
-- 6. dashboard_summary — [C1] auth 검증 + [I2] 타임존 수정
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION dashboard_summary(
  p_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_month_start date;
  v_month_end date;
BEGIN
  -- [C1] 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  -- [I2] KST 기준 월초/월말 계산
  v_month_start := (date_trunc('month', now() AT TIME ZONE 'Asia/Seoul'))::date;
  v_month_end := ((date_trunc('month', now() AT TIME ZONE 'Asia/Seoul') + interval '1 month' - interval '1 day'))::date;

  SELECT jsonb_build_object(
    'pending', jsonb_build_object(
      'draft_po_count', (
        SELECT count(*) FROM purchase_orders
        WHERE company_id = p_company_id AND status = 'draft'
      ),
      'draft_so_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id AND status = 'draft'
      ),
      'confirmed_so_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id AND status = 'confirmed'
      )
    ),
    'monthly_purchase', jsonb_build_object(
      'total_amount', COALESCE((
        SELECT SUM(total_amount) FROM purchase_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status NOT IN ('draft', 'cancelled')
      ), 0),
      'order_count', (
        SELECT count(*) FROM purchase_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status NOT IN ('draft', 'cancelled')
      )
    ),
    'monthly_sales', jsonb_build_object(
      'total_amount', COALESCE((
        SELECT SUM(total_amount) FROM sales_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status = 'shipped'
      ), 0),
      'total_cogs', COALESCE((
        SELECT SUM(sol.cost_of_goods)
        FROM sales_order_lines sol
        JOIN sales_orders so ON so.id = sol.sales_order_id
        WHERE so.company_id = p_company_id
          AND so.order_date >= v_month_start
          AND so.order_date <= v_month_end
          AND so.status = 'shipped'
      ), 0),
      'order_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status = 'shipped'
      )
    ),
    'onboarding', jsonb_build_object(
      'partner_count', (
        SELECT count(*) FROM partners
        WHERE company_id = p_company_id AND is_active = true
      ),
      'warehouse_count', (
        SELECT count(*) FROM warehouses
        WHERE company_id = p_company_id AND is_active = true
      ),
      'item_count', (
        SELECT count(*) FROM items
        WHERE company_id = p_company_id AND is_active = true
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
