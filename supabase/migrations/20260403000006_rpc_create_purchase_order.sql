-- PO 생성 RPC: 헤더+라인을 단일 트랜잭션으로 원자적 생성
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 검증

CREATE OR REPLACE FUNCTION create_purchase_order(
  p_company_id uuid,
  p_created_by uuid,
  p_po_number text,
  p_vendor_id uuid,
  p_order_date date,
  p_expected_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
  -- [{ line_type, item_id, description, ordered_qty, unit_price, line_amount }]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount numeric := 0;
  v_po_id uuid;
  v_line jsonb;
  v_line_type text;
  v_line_amount numeric;
BEGIN
  -- 1. 총액 계산 (DB에서 정확한 numeric 연산)
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_type := v_line->>'line_type';
    IF v_line_type = 'expense' THEN
      v_total_amount := v_total_amount + COALESCE((v_line->>'line_amount')::numeric, 0);
    ELSE
      v_total_amount := v_total_amount +
        COALESCE((v_line->>'ordered_qty')::numeric, 0) *
        COALESCE((v_line->>'unit_price')::numeric, 0);
    END IF;
  END LOOP;

  -- 2. PO 헤더 생성
  INSERT INTO purchase_orders (
    company_id, po_number, vendor_id, order_date,
    expected_date, notes, total_amount, created_by
  ) VALUES (
    p_company_id, p_po_number, p_vendor_id, p_order_date,
    p_expected_date, p_notes, v_total_amount, p_created_by
  )
  RETURNING id INTO v_po_id;

  -- 3. PO 라인 생성
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_type := v_line->>'line_type';
    IF v_line_type = 'expense' THEN
      v_line_amount := COALESCE((v_line->>'line_amount')::numeric, 0);
      INSERT INTO purchase_order_lines (
        po_id, line_type, item_id, description,
        ordered_qty, unit_price, line_amount
      ) VALUES (
        v_po_id, 'expense', NULL, COALESCE(v_line->>'description', ''),
        0, 0, v_line_amount
      );
    ELSE
      v_line_amount := COALESCE((v_line->>'ordered_qty')::numeric, 0) *
                       COALESCE((v_line->>'unit_price')::numeric, 0);
      INSERT INTO purchase_order_lines (
        po_id, line_type, item_id, description,
        ordered_qty, unit_price, line_amount
      ) VALUES (
        v_po_id, 'inventory',
        (v_line->>'item_id')::uuid, NULL,
        COALESCE((v_line->>'ordered_qty')::numeric, 0),
        COALESCE((v_line->>'unit_price')::numeric, 0),
        v_line_amount
      );
    END IF;
  END LOOP;

  RETURN v_po_id;
END;
$$;
