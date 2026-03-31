-- 대시보드용 RPC 함수

-- 1. 재발주 필요 품목 (현재고 < min_stock_qty)
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

-- 2. 대시보드 요약 (처리 대기 건수 + 이번 달 매입/매출)
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
  v_month_start := date_trunc('month', current_date)::date;
  v_month_end := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;

  SELECT jsonb_build_object(
    -- 처리 대기 건수
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
    -- 이번 달 매입 요약
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
    -- 이번 달 매출 요약
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
    -- 온보딩 상태 (기초 데이터 건수)
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
