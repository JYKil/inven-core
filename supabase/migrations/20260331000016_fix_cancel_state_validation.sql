-- 취소 RPC 추가 수정
-- [#2] 상태 검증 강화: 특정 상태에서만 취소 허용
-- [#8] inventory_summary 부재 시 RAISE EXCEPTION (조용한 불일치 방지)

-- ══════════════════════════════════════════════════════════
-- 1. cancel_goods_receipt — confirmed만 취소 + summary 부재 검증
-- ══════════════════════════════════════════════════════════

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
  -- 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  -- 입고 문서 조회 + 잠금
  SELECT * INTO v_receipt
  FROM goods_receipts
  WHERE id = p_goods_receipt_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '입고 문서를 찾을 수 없습니다';
  END IF;

  -- [#2] confirmed 상태만 취소 가능
  IF v_receipt.status != 'confirmed' THEN
    RAISE EXCEPTION '확정된 입고만 취소할 수 있습니다 (현재 상태: %)', v_receipt.status;
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
    -- 해당 라인이 생성한 활성 로트 조회 (remaining_qty > 0으로 좀비 제외)
    SELECT * INTO v_lot
    FROM inventory_lots
    WHERE source_type = 'purchase'
      AND source_id = v_line.id
      AND company_id = p_company_id
      AND remaining_qty > 0
    FOR UPDATE;

    IF FOUND THEN
      -- 후속 소비 검증
      IF v_lot.remaining_qty < v_lot.initial_qty THEN
        RAISE EXCEPTION '품목 "%"의 입고 로트가 이미 사용되었습니다 (초기: %, 잔여: %). 해당 출고/조립/이동을 먼저 취소하세요',
          v_line.item_name, v_lot.initial_qty, v_lot.remaining_qty;
      END IF;

      -- 로트 잔여 수량 0으로 설정
      UPDATE inventory_lots
      SET remaining_qty = 0
      WHERE id = v_lot.id;

      -- [#8] inventory_summary 차감 + 부재 검증
      UPDATE inventory_summary
      SET total_qty = GREATEST(0, total_qty - v_lot.initial_qty),
          total_value = GREATEST(0, total_value - (v_lot.initial_qty * v_lot.unit_cost)),
          updated_at = now()
      WHERE company_id = p_company_id
        AND item_id = v_line.item_id
        AND warehouse_id = v_receipt.warehouse_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION '품목 "%"의 재고 요약 데이터가 없습니다. 데이터 정합성을 확인하세요', v_line.item_name;
      END IF;
    END IF;

    -- 역분개 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, notes, created_by
    ) VALUES (
      p_company_id, v_line.item_id, v_receipt.warehouse_id,
      'purchase_in_cancel', -(v_line.quantity),
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

-- ══════════════════════════════════════════════════════════
-- 2. cancel_transfer — completed만 취소 + summary 부재 검증
-- ══════════════════════════════════════════════════════════

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
  -- 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  -- 이동 문서 조회 + 잠금
  SELECT * INTO v_transfer
  FROM warehouse_transfers
  WHERE id = p_warehouse_transfer_id
    AND company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '이동 문서를 찾을 수 없습니다';
  END IF;

  -- [#2] completed 상태만 취소 가능
  IF v_transfer.status != 'completed' THEN
    RAISE EXCEPTION '완료된 이동만 취소할 수 있습니다 (현재 상태: %)', v_transfer.status;
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
      AND remaining_qty > 0
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

      -- [#8] 도착지 inventory_summary 차감 + 부재 검증
      UPDATE inventory_summary
      SET total_qty = GREATEST(0, total_qty - v_dest_lot.initial_qty),
          total_value = GREATEST(0, total_value - (v_dest_lot.initial_qty * v_dest_lot.unit_cost)),
          updated_at = now()
      WHERE company_id = p_company_id
        AND item_id = v_line.item_id
        AND warehouse_id = v_transfer.to_warehouse_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION '품목 "%"의 도착지 재고 요약 데이터가 없습니다. 데이터 정합성을 확인하세요', v_line.item_name;
      END IF;

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

-- ══════════════════════════════════════════════════════════
-- 3. cancel_assembly — summary 부재 검증 추가
-- ══════════════════════════════════════════════════════════

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
  -- 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

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
    AND remaining_qty > 0
  FOR UPDATE;

  IF FOUND THEN
    IF v_product_lot.remaining_qty < v_product_lot.initial_qty THEN
      RAISE EXCEPTION '조립 결과물이 이미 사용되었습니다 (초기: %, 잔여: %). 해당 출고/조립/이동을 먼저 취소하세요',
        v_product_lot.initial_qty, v_product_lot.remaining_qty;
    END IF;

    -- 결과물 로트 제거
    UPDATE inventory_lots
    SET remaining_qty = 0
    WHERE id = v_product_lot.id;

    -- [#8] 결과물 inventory_summary 차감 + 부재 검증
    UPDATE inventory_summary
    SET total_qty = GREATEST(0, total_qty - v_product_lot.initial_qty),
        total_value = GREATEST(0, total_value - (v_product_lot.initial_qty * v_product_lot.unit_cost)),
        updated_at = now()
    WHERE company_id = p_company_id
      AND item_id = v_order.product_item_id
      AND warehouse_id = v_order.warehouse_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION '조립 결과물의 재고 요약 데이터가 없습니다. 데이터 정합성을 확인하세요';
    END IF;

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
    ORDER BY item_id
  LOOP
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
