-- execute_goods_receipt 보안 강화:
-- 1. 빈 lines 배열 방어
-- 2. PO 라인 조회 시 company_id 검증
-- 3. PO 상태 갱신 시 company_id 필터

DROP FUNCTION IF EXISTS execute_goods_receipt(uuid, text, uuid, uuid, date, text, uuid, jsonb);

CREATE OR REPLACE FUNCTION execute_goods_receipt(
  p_company_id uuid,
  p_receipt_number text,
  p_po_id uuid DEFAULT NULL,
  p_warehouse_id uuid DEFAULT NULL,
  p_receipt_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_lines jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt_id uuid;
  v_line jsonb;
  v_line_id uuid;
  v_po_line_ordered numeric;
  v_po_line_received numeric;
  v_po_line_company uuid;
  v_new_received numeric;
  v_txn_id uuid;
  v_all_received boolean;
  v_any_received boolean;
BEGIN
  -- 0. 입력 검증: lines 배열 필수
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION '입고 라인이 필요합니다';
  END IF;

  -- 0b. PO가 지정된 경우 소유권 검증
  IF p_po_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE id = p_po_id AND company_id = p_company_id
    ) THEN
      RAISE EXCEPTION '발주서를 찾을 수 없거나 권한이 없습니다';
    END IF;
  END IF;

  -- 1. 입고 헤더 생성
  INSERT INTO goods_receipts (company_id, receipt_number, po_id, warehouse_id, receipt_date, notes, created_by)
  VALUES (p_company_id, p_receipt_number, p_po_id, p_warehouse_id, p_receipt_date, p_notes, p_created_by)
  RETURNING id INTO v_receipt_id;

  -- 2. 각 라인 처리
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    -- 2a. PO 라인이 있으면 초과 입고 방지 체크 + company_id 검증
    IF v_line->>'po_line_id' IS NOT NULL THEN
      SELECT pol.ordered_qty, pol.received_qty, po.company_id
      INTO v_po_line_ordered, v_po_line_received, v_po_line_company
      FROM purchase_order_lines pol
      JOIN purchase_orders po ON po.id = pol.po_id
      WHERE pol.id = (v_line->>'po_line_id')::uuid
      FOR UPDATE OF pol;

      -- company_id 검증
      IF v_po_line_company IS NULL OR v_po_line_company != p_company_id THEN
        RAISE EXCEPTION '발주 라인을 찾을 수 없거나 권한이 없습니다';
      END IF;

      v_new_received := v_po_line_received + (v_line->>'quantity')::numeric;

      IF v_new_received > v_po_line_ordered THEN
        RAISE EXCEPTION '초과 입고: 발주수량=%, 누적입고=%, 이번입고=%',
          v_po_line_ordered, v_po_line_received, (v_line->>'quantity')::numeric;
      END IF;

      -- PO 라인 입고수량 갱신
      UPDATE purchase_order_lines
      SET received_qty = v_new_received
      WHERE id = (v_line->>'po_line_id')::uuid;
    END IF;

    -- 2b. 입고 라인 생성
    INSERT INTO goods_receipt_lines (receipt_id, po_line_id, item_id, quantity, unit_price)
    VALUES (
      v_receipt_id,
      CASE WHEN v_line->>'po_line_id' IS NOT NULL THEN (v_line->>'po_line_id')::uuid ELSE NULL END,
      (v_line->>'item_id')::uuid,
      (v_line->>'quantity')::numeric,
      (v_line->>'unit_price')::numeric
    )
    RETURNING id INTO v_line_id;

    -- 2c. 재고 트랜잭션 기록
    INSERT INTO inventory_transactions (
      company_id, item_id, warehouse_id, transaction_type,
      quantity, unit_cost, total_cost,
      reference_type, reference_id, transaction_date, created_by
    )
    VALUES (
      p_company_id,
      (v_line->>'item_id')::uuid,
      p_warehouse_id,
      'purchase_in',
      (v_line->>'quantity')::numeric,
      (v_line->>'unit_price')::numeric,
      (v_line->>'quantity')::numeric * (v_line->>'unit_price')::numeric,
      'goods_receipt',
      v_receipt_id,
      p_receipt_date::timestamptz,
      p_created_by
    )
    RETURNING id INTO v_txn_id;

    -- 2d. 로트 생성
    INSERT INTO inventory_lots (
      company_id, item_id, warehouse_id, lot_date, unit_cost,
      initial_qty, remaining_qty, source_type, source_id
    )
    VALUES (
      p_company_id,
      (v_line->>'item_id')::uuid,
      p_warehouse_id,
      p_receipt_date::timestamptz,
      (v_line->>'unit_price')::numeric,
      (v_line->>'quantity')::numeric,
      (v_line->>'quantity')::numeric,
      'purchase',
      v_line_id
    );

    -- 2e. inventory_summary UPSERT
    INSERT INTO inventory_summary (company_id, item_id, warehouse_id, total_qty, total_value)
    VALUES (
      p_company_id,
      (v_line->>'item_id')::uuid,
      p_warehouse_id,
      (v_line->>'quantity')::numeric,
      (v_line->>'quantity')::numeric * (v_line->>'unit_price')::numeric
    )
    ON CONFLICT (company_id, item_id, warehouse_id)
    DO UPDATE SET
      total_qty = inventory_summary.total_qty + EXCLUDED.total_qty,
      total_value = inventory_summary.total_value + EXCLUDED.total_value,
      updated_at = now();
  END LOOP;

  -- 3. PO 상태 갱신 (company_id 필터 추가)
  IF p_po_id IS NOT NULL THEN
    SELECT
      bool_and(received_qty >= ordered_qty),
      bool_or(received_qty > 0)
    INTO v_all_received, v_any_received
    FROM purchase_order_lines
    WHERE po_id = p_po_id;

    IF v_all_received THEN
      UPDATE purchase_orders SET status = 'received'
      WHERE id = p_po_id AND company_id = p_company_id;
    ELSIF v_any_received THEN
      UPDATE purchase_orders SET status = 'partially_received'
      WHERE id = p_po_id AND company_id = p_company_id;
    END IF;
  END IF;

  RETURN v_receipt_id;
END;
$$;
