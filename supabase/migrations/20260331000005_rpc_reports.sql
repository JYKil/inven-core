-- 보고서용 RPC 함수 3종

-- 1. 재고 수불부 (기간별 입출고 내역 + 기초/기말 잔량)
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
  WITH filtered_items AS (
    -- 대상 품목/창고 조합
    SELECT DISTINCT it.item_id, it.warehouse_id
    FROM inventory_transactions it
    WHERE it.company_id = p_company_id
      AND (p_item_id IS NULL OR it.item_id = p_item_id)
      AND (p_warehouse_id IS NULL OR it.warehouse_id = p_warehouse_id)
  ),
  opening_balance AS (
    -- 기초 잔량: 기간 시작일 이전 트랜잭션 합계
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
  period_transactions AS (
    -- 기간 내 트랜잭션 상세
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
    -- 품목/창고별 기간 합계
    SELECT pt.item_id, pt.warehouse_id,
           pt.item_code, pt.item_name, pt.warehouse_name,
           COALESCE(ob.qty, 0) AS opening_qty,
           COALESCE(ob.value, 0) AS opening_value,
           COALESCE(SUM(CASE WHEN pt.quantity > 0 THEN pt.quantity ELSE 0 END), 0) AS total_in_qty,
           COALESCE(SUM(CASE WHEN pt.quantity < 0 THEN ABS(pt.quantity) ELSE 0 END), 0) AS total_out_qty,
           COALESCE(ob.qty, 0) + COALESCE(SUM(pt.quantity), 0) AS closing_qty
    FROM period_transactions pt
    LEFT JOIN opening_balance ob
      ON ob.item_id = pt.item_id AND ob.warehouse_id = pt.warehouse_id
    GROUP BY pt.item_id, pt.warehouse_id, pt.item_code, pt.item_name, pt.warehouse_name,
             ob.qty, ob.value
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'summary', COALESCE((SELECT jsonb_agg(row_to_json(s)) FROM summary s), '[]'::jsonb),
    'transactions', COALESCE((SELECT jsonb_agg(row_to_json(pt)) FROM period_transactions pt), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 2. 창고별 재고 현황
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

-- 3. 매출 보고서
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
