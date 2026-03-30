-- FIFO 로트 소비 함수
-- 지정된 품목/창고에서 FIFO 순서로 로트를 소비하고, 소비 총원가를 반환
-- 조립, 출고, 창고 이동 등에서 공통으로 사용

CREATE OR REPLACE FUNCTION consume_inventory(
  p_company_id uuid,
  p_item_id uuid,
  p_warehouse_id uuid,
  p_qty numeric,
  p_transaction_id uuid
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lot RECORD;
  v_remaining numeric := p_qty;
  v_total_cost numeric := 0;
  v_consume numeric;
  v_costing_method varchar;
BEGIN
  -- 회사의 원가 계산 방식 조회
  SELECT costing_method INTO v_costing_method
  FROM companies WHERE id = p_company_id;

  -- FIFO/LIFO에 따라 정렬 방향 결정하여 로트 순회
  FOR v_lot IN
    SELECT id, remaining_qty, unit_cost
    FROM inventory_lots
    WHERE company_id = p_company_id
      AND item_id = p_item_id
      AND warehouse_id = p_warehouse_id
      AND remaining_qty > 0
    ORDER BY
      CASE WHEN v_costing_method = 'LIFO' THEN lot_date END DESC,
      CASE WHEN v_costing_method != 'LIFO' THEN lot_date END ASC
    FOR UPDATE  -- 동시성 잠금
  LOOP
    IF v_remaining <= 0 THEN EXIT; END IF;

    v_consume := LEAST(v_lot.remaining_qty, v_remaining);

    -- 로트 잔여 수량 차감
    UPDATE inventory_lots
    SET remaining_qty = remaining_qty - v_consume
    WHERE id = v_lot.id;

    -- 소비 이력 기록
    INSERT INTO inventory_lot_consumptions (lot_id, consumed_qty, transaction_id)
    VALUES (v_lot.id, v_consume, p_transaction_id);

    v_total_cost := v_total_cost + (v_consume * v_lot.unit_cost);
    v_remaining := v_remaining - v_consume;
  END LOOP;

  -- 수량 부족 시 롤백
  IF v_remaining > 0 THEN
    RAISE EXCEPTION '재고 부족: item_id=%, warehouse_id=%, 부족 수량=%',
      p_item_id, p_warehouse_id, v_remaining;
  END IF;

  -- inventory_summary 갱신
  UPDATE inventory_summary
  SET total_qty = total_qty - p_qty,
      total_value = total_value - v_total_cost,
      updated_at = now()
  WHERE company_id = p_company_id
    AND item_id = p_item_id
    AND warehouse_id = p_warehouse_id;

  RETURN v_total_cost;
END;
$$;
