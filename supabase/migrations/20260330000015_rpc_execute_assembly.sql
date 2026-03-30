-- 조립 실행 RPC: BOM 기반으로 재료 FIFO 소비 + 결과물 로트 생성
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 필터링

CREATE OR REPLACE FUNCTION execute_assembly(
  p_company_id uuid,
  p_order_number text,
  p_bom_header_id uuid,
  p_product_item_id uuid,
  p_warehouse_id uuid,
  p_quantity numeric,
  p_assembly_date date,
  p_created_by uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_bom_line RECORD;
  v_required_qty numeric;
  v_txn_id uuid;
  v_consumed_cost numeric;
  v_total_cost numeric := 0;
  v_unit_cost numeric;
  v_product_txn_id uuid;
BEGIN
  -- 입력값 검증
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION '수량은 0보다 커야 합니다: %', p_quantity;
  END IF;

  -- BOM 라인 존재 여부 확인
  IF NOT EXISTS (
    SELECT 1 FROM bom_lines WHERE bom_header_id = p_bom_header_id
  ) THEN
    RAISE EXCEPTION 'BOM에 재료 라인이 없습니다: bom_header_id=%', p_bom_header_id;
  END IF;

  -- 1. 조립 지시 헤더 생성 (바로 completed)
  INSERT INTO assembly_orders (
    company_id, order_number, bom_header_id, product_item_id,
    warehouse_id, quantity, assembly_date, status, created_by
  )
  VALUES (
    p_company_id, p_order_number, p_bom_header_id, p_product_item_id,
    p_warehouse_id, p_quantity, p_assembly_date, 'completed', p_created_by
  )
  RETURNING id INTO v_order_id;

  -- 2. BOM 라인 순회 (item_id 순서로 정렬 → 데드락 방지)
  FOR v_bom_line IN
    SELECT bl.material_item_id, bl.quantity AS bom_qty
    FROM bom_lines bl
    WHERE bl.bom_header_id = p_bom_header_id
    ORDER BY bl.material_item_id  -- 데드락 방지를 위한 고정 순서
  LOOP
    v_required_qty := v_bom_line.bom_qty * p_quantity;

    -- 2a. 재료 출고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id, transaction_type,
      quantity, reference_type, reference_id,
      transaction_date, created_by
    )
    VALUES (
      p_company_id, v_bom_line.material_item_id, p_warehouse_id,
      'assembly_out', -v_required_qty,
      'assembly_order', v_order_id,
      p_assembly_date::timestamptz, p_created_by
    )
    RETURNING id INTO v_txn_id;

    -- 2b. FIFO 로트 소비
    v_consumed_cost := consume_inventory(
      p_company_id, v_bom_line.material_item_id,
      p_warehouse_id, v_required_qty, v_txn_id
    );

    -- 2c. 트랜잭션에 원가 정보 갱신
    UPDATE inventory_transactions
    SET unit_cost = v_consumed_cost / v_required_qty,
        total_cost = v_consumed_cost
    WHERE id = v_txn_id;

    -- 2d. 조립 재료 라인 기록
    INSERT INTO assembly_order_lines (
      assembly_order_id, material_item_id,
      required_qty, consumed_qty, consumed_cost
    )
    VALUES (
      v_order_id, v_bom_line.material_item_id,
      v_required_qty, v_required_qty, v_consumed_cost
    );

    v_total_cost := v_total_cost + v_consumed_cost;
  END LOOP;

  -- 3. 원가 계산 및 조립 지시 갱신
  v_unit_cost := v_total_cost / p_quantity;

  UPDATE assembly_orders
  SET total_cost = v_total_cost,
      unit_cost = v_unit_cost
  WHERE id = v_order_id;

  -- 4. 결과물 입고 트랜잭션
  INSERT INTO inventory_transactions (
    company_id, item_id, warehouse_id, transaction_type,
    quantity, unit_cost, total_cost,
    reference_type, reference_id,
    transaction_date, created_by
  )
  VALUES (
    p_company_id, p_product_item_id, p_warehouse_id,
    'assembly_in', p_quantity, v_unit_cost, v_total_cost,
    'assembly_order', v_order_id,
    p_assembly_date::timestamptz, p_created_by
  )
  RETURNING id INTO v_product_txn_id;

  -- 5. 결과물 로트 생성
  INSERT INTO inventory_lots (
    company_id, item_id, warehouse_id, lot_date, unit_cost,
    initial_qty, remaining_qty, source_type, source_id
  )
  VALUES (
    p_company_id, p_product_item_id, p_warehouse_id,
    p_assembly_date::timestamptz, v_unit_cost,
    p_quantity, p_quantity, 'assembly', v_order_id
  );

  -- 6. 결과물 inventory_summary UPSERT
  INSERT INTO inventory_summary (company_id, item_id, warehouse_id, total_qty, total_value)
  VALUES (p_company_id, p_product_item_id, p_warehouse_id, p_quantity, v_total_cost)
  ON CONFLICT (company_id, item_id, warehouse_id)
  DO UPDATE SET
    total_qty = inventory_summary.total_qty + EXCLUDED.total_qty,
    total_value = inventory_summary.total_value + EXCLUDED.total_value,
    updated_at = now();

  RETURN v_order_id;
END;
$$;
