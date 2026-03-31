-- 조립 취소 RPC
-- completed 상태의 조립을 cancelled로 변경
-- 결과물 로트 제거 + 재료 로트 복원 (양방향)

CREATE OR REPLACE FUNCTION cancel_assembly(
  p_assembly_order_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_product_lot RECORD;
  v_txn RECORD;
  v_restored RECORD;
  v_restored_lots integer := 0;
  v_restored_qty numeric := 0;
BEGIN
  -- 조립 주문 조회 + 잠금
  SELECT * INTO v_order
  FROM assembly_orders
  WHERE id = p_assembly_order_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '조립 주문을 찾을 수 없습니다';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION '이미 취소된 조립입니다';
  END IF;

  IF v_order.status != 'completed' THEN
    RAISE EXCEPTION '완료된 조립만 취소할 수 있습니다 (현재 상태: %)', v_order.status;
  END IF;

  -- === 결과물 로트 후속 소비 검증 + 제거 ===
  SELECT * INTO v_product_lot
  FROM inventory_lots
  WHERE source_type = 'assembly'
    AND source_id = p_assembly_order_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF FOUND THEN
    -- 후속 소비 검증
    IF v_product_lot.remaining_qty < v_product_lot.initial_qty THEN
      RAISE EXCEPTION '조립 결과물이 이미 사용되었습니다 (초기: %, 잔여: %). 해당 출고/조립/이동을 먼저 취소하세요',
        v_product_lot.initial_qty, v_product_lot.remaining_qty;
    END IF;

    -- 결과물 로트 제거
    UPDATE inventory_lots
    SET remaining_qty = 0
    WHERE id = v_product_lot.id;

    -- 결과물 inventory_summary 차감
    UPDATE inventory_summary
    SET total_qty = GREATEST(0, total_qty - v_product_lot.initial_qty),
        total_value = GREATEST(0, total_value - (v_product_lot.initial_qty * v_product_lot.unit_cost)),
        updated_at = now()
    WHERE company_id = p_company_id
      AND item_id = v_order.product_item_id
      AND warehouse_id = v_order.warehouse_id;

    -- 결과물 역분개 트랜잭션
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, notes, created_by
    ) VALUES (
      p_company_id, v_order.product_item_id, v_order.warehouse_id,
      'assembly_in_cancel', -(v_product_lot.initial_qty),
      v_product_lot.unit_cost, v_product_lot.initial_qty * v_product_lot.unit_cost,
      'assembly_cancel', p_assembly_order_id,
      now(), p_reason, v_order.created_by
    );
  END IF;

  -- === 재료 로트 복원 ===
  FOR v_txn IN
    SELECT id, item_id, warehouse_id, quantity, total_cost
    FROM inventory_transactions
    WHERE reference_type = 'assembly_order'
      AND reference_id = p_assembly_order_id
      AND transaction_type = 'assembly_out'
      AND company_id = p_company_id
    ORDER BY item_id  -- 데드락 방지
  LOOP
    -- 로트 소비 복원
    FOR v_restored IN
      SELECT * FROM restore_lot_consumptions(v_txn.id, p_company_id)
    LOOP
      v_restored_lots := v_restored_lots + 1;
      v_restored_qty := v_restored_qty + v_restored.restored_qty;
    END LOOP;

    -- 재료 역분개 트랜잭션
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, notes, created_by
    ) VALUES (
      p_company_id, v_txn.item_id, v_txn.warehouse_id,
      'assembly_out_cancel', ABS(v_txn.quantity),
      CASE WHEN v_txn.quantity != 0 THEN ABS(v_txn.total_cost / v_txn.quantity) ELSE 0 END,
      ABS(v_txn.total_cost),
      'assembly_cancel', p_assembly_order_id,
      now(), p_reason, v_order.created_by
    );
  END LOOP;

  -- 조립 주문 상태 변경
  UPDATE assembly_orders
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_reason
  WHERE id = p_assembly_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'assembly_order_id', p_assembly_order_id,
    'restored_lots', v_restored_lots,
    'restored_qty', v_restored_qty
  );
END;
$$;
