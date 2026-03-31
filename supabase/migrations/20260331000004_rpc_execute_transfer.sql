-- 창고 이동 실행 RPC
-- 출발지에서 FIFO 로트 소비 → 도착지에 동일 단가로 새 lot 생성
-- consume_inventory() 재활용

CREATE OR REPLACE FUNCTION execute_transfer(
  p_company_id uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id uuid,
  p_transfer_date date,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id uuid;
  v_transfer_number varchar(50);
  v_line jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_txn_out_id uuid;
  v_txn_in_id uuid;
  v_cost numeric;
  v_unit_cost numeric;
  v_lot_id uuid;
  v_total_lines int := 0;
BEGIN
  -- 출발지/도착지 동일 검증
  IF p_from_warehouse_id = p_to_warehouse_id THEN
    RAISE EXCEPTION '출발 창고와 도착 창고가 동일합니다';
  END IF;

  -- 라인 비어있으면 에러
  IF jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION '이동할 품목이 없습니다';
  END IF;

  -- 이동 번호 생성 (TRF-YYYYMMDD-NNN)
  SELECT 'TRF-' || to_char(p_transfer_date, 'YYYYMMDD') || '-' ||
         lpad((count(*) + 1)::text, 3, '0')
  INTO v_transfer_number
  FROM warehouse_transfers
  WHERE company_id = p_company_id
    AND transfer_date = p_transfer_date;

  -- 이동 전표 생성
  INSERT INTO warehouse_transfers (
    company_id, transfer_number, from_warehouse_id, to_warehouse_id,
    transfer_date, status, notes, created_by
  ) VALUES (
    p_company_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
    p_transfer_date, 'completed', p_notes, p_created_by
  )
  RETURNING id INTO v_transfer_id;

  -- 각 라인별 처리 (item_id 순서로 데드락 방지)
  FOR v_line IN
    SELECT * FROM jsonb_array_elements(p_lines) elem
    ORDER BY (elem->>'item_id')::uuid
  LOOP
    v_item_id := (v_line->>'item_id')::uuid;
    v_quantity := (v_line->>'quantity')::numeric;

    IF v_quantity <= 0 THEN
      RAISE EXCEPTION '이동 수량은 0보다 커야 합니다';
    END IF;

    -- 1. 출발지 출고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, created_by
    ) VALUES (
      p_company_id, v_item_id, p_from_warehouse_id,
      'transfer_out', -v_quantity, NULL, NULL,
      'transfer', v_transfer_id,
      p_transfer_date, p_created_by
    )
    RETURNING id INTO v_txn_out_id;

    -- 2. FIFO 로트 소비 (출발지)
    v_cost := consume_inventory(
      p_company_id, v_item_id, p_from_warehouse_id,
      v_quantity, v_txn_out_id
    );

    v_unit_cost := v_cost / v_quantity;

    -- 출고 트랜잭션에 원가 기록
    UPDATE inventory_transactions
    SET unit_cost = v_unit_cost,
        total_cost = v_cost
    WHERE id = v_txn_out_id;

    -- 3. 도착지 입고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id,
      transaction_type, quantity, unit_cost, total_cost,
      reference_type, reference_id,
      transaction_date, created_by
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      'transfer_in', v_quantity, v_unit_cost, v_cost,
      'transfer', v_transfer_id,
      p_transfer_date, p_created_by
    )
    RETURNING id INTO v_txn_in_id;

    -- 4. 도착지에 새 lot 생성 (출발지 가중평균 단가 유지)
    INSERT INTO inventory_lots (
      company_id, item_id, warehouse_id,
      lot_date, unit_cost, initial_qty, remaining_qty,
      source_type, source_id
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      now(), v_unit_cost, v_quantity, v_quantity,
      'transfer_in', v_transfer_id
    )
    RETURNING id INTO v_lot_id;

    -- 5. 도착지 inventory_summary UPSERT
    INSERT INTO inventory_summary (
      company_id, item_id, warehouse_id,
      total_qty, total_value
    ) VALUES (
      p_company_id, v_item_id, p_to_warehouse_id,
      v_quantity, v_cost
    )
    ON CONFLICT (company_id, item_id, warehouse_id)
    DO UPDATE SET
      total_qty = inventory_summary.total_qty + v_quantity,
      total_value = inventory_summary.total_value + v_cost,
      updated_at = now();

    -- 6. 이동 라인 기록
    INSERT INTO warehouse_transfer_lines (
      transfer_id, item_id, quantity, unit_cost
    ) VALUES (
      v_transfer_id, v_item_id, v_quantity, v_unit_cost
    );

    v_total_lines := v_total_lines + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'transfer_id', v_transfer_id,
    'transfer_number', v_transfer_number,
    'total_lines', v_total_lines
  );
END;
$$;
