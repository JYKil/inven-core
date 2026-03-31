-- 출고 실행 RPC
-- 판매 주문의 모든 라인에 대해 FIFO 로트 소비 + 매출원가 계산
-- consume_inventory() 재활용

CREATE OR REPLACE FUNCTION execute_shipment(
  p_sales_order_id uuid,
  p_company_id uuid,
  p_created_by uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_line RECORD;
  v_txn_id uuid;
  v_cost numeric;
  v_total_cogs numeric := 0;
BEGIN
  -- 판매 주문 조회 + 상태 확인 (atomic WHERE로 race condition 방지)
  SELECT * INTO v_order
  FROM sales_orders
  WHERE id = p_sales_order_id
    AND company_id = p_company_id
    AND status = 'confirmed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '출고 가능한 판매 주문이 아닙니다 (확정 상태만 출고 가능)';
  END IF;

  -- 각 라인별 출고 처리
  FOR v_line IN
    SELECT sol.id, sol.item_id, sol.warehouse_id, sol.quantity, sol.unit_price,
           i.code AS item_code, i.name AS item_name
    FROM sales_order_lines sol
    JOIN items i ON i.id = sol.item_id
    WHERE sol.sales_order_id = p_sales_order_id
    ORDER BY sol.item_id  -- 데드락 방지: item_id 순서
  LOOP
    -- 감사 트랜잭션 기록 생성 (consume_inventory가 lot_consumptions에 연결)
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, created_by
    ) VALUES (
      p_company_id, v_line.item_id, v_line.warehouse_id,
      'sale_out', -v_line.quantity, NULL, NULL,
      'sales_order', p_sales_order_id,
      v_order.order_date, p_created_by
    )
    RETURNING id INTO v_txn_id;

    -- FIFO 로트 소비 — 재고 부족 시 EXCEPTION 발생
    v_cost := consume_inventory(
      p_company_id, v_line.item_id, v_line.warehouse_id,
      v_line.quantity, v_txn_id
    );

    -- 트랜잭션에 원가 기록
    UPDATE inventory_transactions
    SET unit_cost = v_cost / v_line.quantity,
        total_cost = v_cost
    WHERE id = v_txn_id;

    -- 라인에 매출원가 기록
    UPDATE sales_order_lines
    SET cost_of_goods = v_cost
    WHERE id = v_line.id;

    v_total_cogs := v_total_cogs + v_cost;
  END LOOP;

  -- 주문 상태 → shipped
  UPDATE sales_orders
  SET status = 'shipped'
  WHERE id = p_sales_order_id;

  RETURN jsonb_build_object(
    'sales_order_id', p_sales_order_id,
    'total_cogs', v_total_cogs,
    'total_amount', v_order.total_amount,
    'gross_profit', v_order.total_amount - v_total_cogs
  );
END;
$$;
