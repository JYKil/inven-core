-- 로트 소비 복원 공통 유틸 함수
-- 출고/조립/이동 취소 시 소비된 로트를 복원하는 공통 로직
-- consume_inventory()의 역연산

CREATE OR REPLACE FUNCTION restore_lot_consumptions(
  p_transaction_id uuid,
  p_company_id uuid
) RETURNS TABLE(lot_id uuid, restored_qty numeric, unit_cost numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumption RECORD;
BEGIN
  -- 해당 트랜잭션의 소비 이력을 순회하며 로트 복원
  FOR v_consumption IN
    SELECT ilc.id AS consumption_id,
           ilc.lot_id,
           ilc.consumed_qty,
           il.unit_cost AS lot_unit_cost,
           il.item_id,
           il.warehouse_id
    FROM inventory_lot_consumptions ilc
    JOIN inventory_lots il ON il.id = ilc.lot_id
    WHERE ilc.transaction_id = p_transaction_id
      AND il.company_id = p_company_id
    FOR UPDATE OF il  -- 로트 잠금
  LOOP
    -- 로트 잔여 수량 복원
    UPDATE inventory_lots
    SET remaining_qty = remaining_qty + v_consumption.consumed_qty
    WHERE id = v_consumption.lot_id;

    -- inventory_summary 복원
    UPDATE inventory_summary
    SET total_qty = total_qty + v_consumption.consumed_qty,
        total_value = total_value + (v_consumption.consumed_qty * v_consumption.lot_unit_cost),
        updated_at = now()
    WHERE company_id = p_company_id
      AND item_id = v_consumption.item_id
      AND warehouse_id = v_consumption.warehouse_id;

    -- 반환 값 설정
    lot_id := v_consumption.lot_id;
    restored_qty := v_consumption.consumed_qty;
    unit_cost := v_consumption.lot_unit_cost;
    RETURN NEXT;
  END LOOP;

  -- 소비 이력 삭제
  DELETE FROM inventory_lot_consumptions
  WHERE transaction_id = p_transaction_id;
END;
$$;
