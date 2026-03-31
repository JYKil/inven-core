-- 출고 취소 RPC
-- shipped 상태의 판매주문을 confirmed로 되돌림
-- 소비된 로트를 복원하고 역분개 트랜잭션 기록

CREATE OR REPLACE FUNCTION cancel_shipment(
  p_sales_order_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_txn RECORD;
  v_restored RECORD;
  v_restored_lots integer := 0;
  v_restored_qty numeric := 0;
BEGIN
  -- 판매 주문 조회 + 잠금
  SELECT * INTO v_order
  FROM sales_orders
  WHERE id = p_sales_order_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '판매 주문을 찾을 수 없습니다';
  END IF;

  IF v_order.status != 'shipped' THEN
    RAISE EXCEPTION '출고된 주문만 취소할 수 있습니다 (현재 상태: %)', v_order.status;
  END IF;

  -- 해당 SO의 출고 트랜잭션 순회
  FOR v_txn IN
    SELECT id, item_id, warehouse_id, quantity, total_cost
    FROM inventory_transactions
    WHERE reference_type = 'sales_order'
      AND reference_id = p_sales_order_id
      AND transaction_type = 'sale_out'
      AND company_id = p_company_id
  LOOP
    -- 로트 소비 복원 (consume_inventory의 역연산)
    FOR v_restored IN
      SELECT * FROM restore_lot_consumptions(v_txn.id, p_company_id)
    LOOP
      v_restored_lots := v_restored_lots + 1;
      v_restored_qty := v_restored_qty + v_restored.restored_qty;
    END LOOP;

    -- 역분개 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, notes, created_by
    ) VALUES (
      p_company_id, v_txn.item_id, v_txn.warehouse_id,
      'sale_out_cancel', ABS(v_txn.quantity),  -- 양수 (복원)
      CASE WHEN v_txn.quantity != 0 THEN ABS(v_txn.total_cost / v_txn.quantity) ELSE 0 END,
      ABS(v_txn.total_cost),
      'sales_order_cancel', p_sales_order_id,
      now(), p_reason, v_order.created_by
    );
  END LOOP;

  -- 라인별 매출원가 초기화
  UPDATE sales_order_lines
  SET cost_of_goods = NULL
  WHERE sales_order_id = p_sales_order_id;

  -- 주문 상태 → confirmed (재출고 가능)
  UPDATE sales_orders
  SET status = 'confirmed',
      cancelled_shipment_at = now(),
      cancel_reason = p_reason
  WHERE id = p_sales_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'sales_order_id', p_sales_order_id,
    'restored_lots', v_restored_lots,
    'restored_qty', v_restored_qty
  );
END;
$$;
