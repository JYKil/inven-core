-- 창고 이동 취소 RPC
-- completed 상태의 이동을 cancelled로 변경
-- 도착지 로트 제거 + 출발지 로트 복원 (양방향)

CREATE OR REPLACE FUNCTION cancel_transfer(
  p_warehouse_transfer_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
  v_line RECORD;
  v_dest_lot RECORD;
  v_txn RECORD;
  v_restored RECORD;
  v_cancelled_lines integer := 0;
  v_restored_qty numeric := 0;
BEGIN
  -- 이동 문서 조회 + 잠금
  SELECT * INTO v_transfer
  FROM warehouse_transfers
  WHERE id = p_warehouse_transfer_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '이동 문서를 찾을 수 없습니다';
  END IF;

  IF v_transfer.status = 'cancelled' THEN
    RAISE EXCEPTION '이미 취소된 이동입니다';
  END IF;

  -- 각 이동 라인 순회
  FOR v_line IN
    SELECT wtl.id, wtl.item_id, wtl.quantity, wtl.unit_cost,
           i.name AS item_name
    FROM warehouse_transfer_lines wtl
    JOIN items i ON i.id = wtl.item_id
    WHERE wtl.transfer_id = p_warehouse_transfer_id
    ORDER BY wtl.item_id  -- 데드락 방지
  LOOP

    -- === 도착지 로트 제거 ===
    SELECT * INTO v_dest_lot
    FROM inventory_lots
    WHERE source_type = 'transfer_in'
      AND source_id = p_warehouse_transfer_id
      AND item_id = v_line.item_id
      AND warehouse_id = v_transfer.to_warehouse_id
      AND company_id = p_company_id
    FOR UPDATE;

    IF FOUND THEN
      -- 후속 소비 검증
      IF v_dest_lot.remaining_qty < v_dest_lot.initial_qty THEN
        RAISE EXCEPTION '품목 "%"의 이동 로트가 도착지에서 이미 사용되었습니다 (초기: %, 잔여: %). 해당 출고/조립/이동을 먼저 취소하세요',
          v_line.item_name, v_dest_lot.initial_qty, v_dest_lot.remaining_qty;
      END IF;

      -- 도착지 로트 제거
      UPDATE inventory_lots
      SET remaining_qty = 0
      WHERE id = v_dest_lot.id;

      -- 도착지 inventory_summary 차감
      UPDATE inventory_summary
      SET total_qty = GREATEST(0, total_qty - v_dest_lot.initial_qty),
          total_value = GREATEST(0, total_value - (v_dest_lot.initial_qty * v_dest_lot.unit_cost)),
          updated_at = now()
      WHERE company_id = p_company_id
        AND item_id = v_line.item_id
        AND warehouse_id = v_transfer.to_warehouse_id;

      -- 도착지 역분개 트랜잭션
      INSERT INTO inventory_transactions (
        company_id, item_id, warehouse_id,
        transaction_type, quantity, unit_cost, total_cost,
        reference_type, reference_id,
        transaction_date, notes, created_by
      ) VALUES (
        p_company_id, v_line.item_id, v_transfer.to_warehouse_id,
        'transfer_in_cancel', -(v_dest_lot.initial_qty),
        v_dest_lot.unit_cost, v_dest_lot.initial_qty * v_dest_lot.unit_cost,
        'transfer_cancel', p_warehouse_transfer_id,
        now(), p_reason, v_transfer.created_by
      );
    END IF;

    -- === 출발지 로트 복원 ===
    FOR v_txn IN
      SELECT id, item_id, warehouse_id, quantity, total_cost
      FROM inventory_transactions
      WHERE reference_type = 'transfer'
        AND reference_id = p_warehouse_transfer_id
        AND transaction_type = 'transfer_out'
        AND item_id = v_line.item_id
        AND company_id = p_company_id
    LOOP
      -- 로트 소비 복원
      FOR v_restored IN
        SELECT * FROM restore_lot_consumptions(v_txn.id, p_company_id)
      LOOP
        v_restored_qty := v_restored_qty + v_restored.restored_qty;
      END LOOP;

      -- 출발지 역분개 트랜잭션
      INSERT INTO inventory_transactions (
        company_id, item_id, warehouse_id,
        transaction_type, quantity, unit_cost, total_cost,
        reference_type, reference_id,
        transaction_date, notes, created_by
      ) VALUES (
        p_company_id, v_txn.item_id, v_txn.warehouse_id,
        'transfer_out_cancel', ABS(v_txn.quantity),
        CASE WHEN v_txn.quantity != 0 THEN ABS(v_txn.total_cost / v_txn.quantity) ELSE 0 END,
        ABS(v_txn.total_cost),
        'transfer_cancel', p_warehouse_transfer_id,
        now(), p_reason, v_transfer.created_by
      );
    END LOOP;

    v_cancelled_lines := v_cancelled_lines + 1;
  END LOOP;

  -- 이동 문서 상태 변경
  UPDATE warehouse_transfers
  SET status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = p_reason
  WHERE id = p_warehouse_transfer_id;

  RETURN jsonb_build_object(
    'success', true,
    'transfer_id', p_warehouse_transfer_id,
    'cancelled_lines', v_cancelled_lines,
    'restored_qty', v_restored_qty
  );
END;
$$;
