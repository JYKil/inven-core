-- 입고 취소 RPC
-- confirmed 상태의 입고를 cancelled로 변경
-- 생성된 로트를 제거하고, PO 상태를 롤백

CREATE OR REPLACE FUNCTION cancel_goods_receipt(
  p_goods_receipt_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt RECORD;
  v_line RECORD;
  v_lot RECORD;
  v_cancelled_lines integer := 0;
  v_restored_qty numeric := 0;
  v_po_id uuid;
  v_po_all_zero boolean;
BEGIN
  -- 입고 문서 조회 + 잠금
  SELECT * INTO v_receipt
  FROM goods_receipts
  WHERE id = p_goods_receipt_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '입고 문서를 찾을 수 없습니다';
  END IF;

  IF v_receipt.status = 'cancelled' THEN
    RAISE EXCEPTION '이미 취소된 입고입니다';
  END IF;

  v_po_id := v_receipt.po_id;

  -- 각 입고 라인 순회
  FOR v_line IN
    SELECT grl.id, grl.item_id, grl.quantity, grl.unit_price, grl.po_line_id,
           i.name AS item_name
    FROM goods_receipt_lines grl
    JOIN items i ON i.id = grl.item_id
    WHERE grl.receipt_id = p_goods_receipt_id
  LOOP
    -- 해당 라인이 생성한 로트 조회
    SELECT * INTO v_lot
    FROM inventory_lots
    WHERE source_type = 'purchase'
      AND source_id = v_line.id
      AND company_id = p_company_id
    FOR UPDATE;

    IF FOUND THEN
      -- 후속 소비 검증 — remaining_qty < initial_qty면 이미 사용됨
      IF v_lot.remaining_qty < v_lot.initial_qty THEN
        RAISE EXCEPTION '품목 "%"의 입고 로트가 이미 사용되었습니다 (초기: %, 잔여: %). 해당 출고/조립/이동을 먼저 취소하세요',
          v_line.item_name, v_lot.initial_qty, v_lot.remaining_qty;
      END IF;

      -- 로트 잔여 수량 0으로 설정 (실질적 제거)
      UPDATE inventory_lots
      SET remaining_qty = 0
      WHERE id = v_lot.id;

      -- inventory_summary 차감
      UPDATE inventory_summary
      SET total_qty = GREATEST(0, total_qty - v_lot.initial_qty),
          total_value = GREATEST(0, total_value - (v_lot.initial_qty * v_lot.unit_cost)),
          updated_at = now()
      WHERE company_id = p_company_id
        AND item_id = v_line.item_id
        AND warehouse_id = v_receipt.warehouse_id;
    END IF;

    -- 역분개 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, notes, created_by
    ) VALUES (
      p_company_id, v_line.item_id, v_receipt.warehouse_id,
      'purchase_in_cancel', -(v_line.quantity),  -- 음수 (제거)
      v_line.unit_price,
      v_line.quantity * v_line.unit_price,
      'goods_receipt_cancel', p_goods_receipt_id,
      now(), p_reason, v_receipt.created_by
    );

    -- PO 라인 received_qty 차감
    IF v_line.po_line_id IS NOT NULL THEN
      UPDATE purchase_order_lines
      SET received_qty = GREATEST(0, received_qty - v_line.quantity)
      WHERE id = v_line.po_line_id;
    END IF;

    v_cancelled_lines := v_cancelled_lines + 1;
    v_restored_qty := v_restored_qty + v_line.quantity;
  END LOOP;

  -- PO 상태 재계산
  IF v_po_id IS NOT NULL THEN
    SELECT bool_and(received_qty = 0) INTO v_po_all_zero
    FROM purchase_order_lines
    WHERE po_id = v_po_id;

    IF v_po_all_zero THEN
      UPDATE purchase_orders SET status = 'confirmed' WHERE id = v_po_id;
    ELSE
      UPDATE purchase_orders SET status = 'partially_received' WHERE id = v_po_id;
    END IF;
  END IF;

  -- 입고 문서 상태 변경
  UPDATE goods_receipts
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_reason
  WHERE id = p_goods_receipt_id;

  RETURN jsonb_build_object(
    'success', true,
    'goods_receipt_id', p_goods_receipt_id,
    'cancelled_lines', v_cancelled_lines,
    'restored_qty', v_restored_qty
  );
END;
$$;
