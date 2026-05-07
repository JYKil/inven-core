-- RPC 소유권 검증 강화: cross-tenant 데이터 참조 방지
-- create_bom: product_item_id + material_item_id 소유권 검증
-- create_bom_version: p_product_item_id를 optional로 변경 + source에서 자동 추출 + 불일치 검증
-- create_purchase_order: vendor_id + item_id 소유권 검증

-- 1. create_bom 재생성
CREATE OR REPLACE FUNCTION create_bom(
  p_company_id uuid,
  p_product_item_id uuid,
  p_version int DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version int;
  v_header_id uuid;
  v_line jsonb;
BEGIN
  -- 1. 버전 결정
  IF p_version IS NOT NULL THEN
    v_version := p_version;
  ELSE
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM bom_headers
    WHERE product_item_id = p_product_item_id
    FOR UPDATE;
  END IF;

  -- 2. 결과 품목 소유권 검증
  IF NOT EXISTS (
    SELECT 1 FROM items WHERE id = p_product_item_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '품목을 찾을 수 없거나 권한이 없습니다: %', p_product_item_id;
  END IF;

  -- 3. 재료 품목 소유권 검증
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM items WHERE id = (v_line->>'material_item_id')::uuid AND company_id = p_company_id
    ) THEN
      RAISE EXCEPTION '재료 품목을 찾을 수 없거나 권한이 없습니다: %', v_line->>'material_item_id';
    END IF;
  END LOOP;

  -- 4. 헤더 생성
  INSERT INTO bom_headers (company_id, product_item_id, version)
  VALUES (p_company_id, p_product_item_id, v_version)
  RETURNING id INTO v_header_id;

  -- 5. 라인 생성
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO bom_lines (bom_header_id, material_item_id, quantity, sort_order)
    VALUES (
      v_header_id,
      (v_line->>'material_item_id')::uuid,
      (v_line->>'quantity')::numeric,
      COALESCE((v_line->>'sort_order')::int, 0)
    );
  END LOOP;

  RETURN v_header_id;
END;
$$;

-- 2. create_bom_version 재생성
CREATE OR REPLACE FUNCTION create_bom_version(
  p_company_id uuid,
  p_source_bom_id uuid,
  p_product_item_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_header_company uuid;
  v_product_item_id uuid;
  v_next_version int;
  v_new_header_id uuid;
BEGIN
  -- 1. 원본 BOM 소유권 검증 + product_item_id 자동 추출
  SELECT company_id, product_item_id INTO v_header_company, v_product_item_id
  FROM bom_headers
  WHERE id = p_source_bom_id;

  IF v_header_company IS NULL THEN
    RAISE EXCEPTION 'BOM을 찾을 수 없습니다: %', p_source_bom_id;
  END IF;

  IF v_header_company != p_company_id THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 1.5. p_product_item_id가 전달된 경우 source와 일치하는지 검증
  IF p_product_item_id IS NOT NULL AND p_product_item_id != v_product_item_id THEN
    RAISE EXCEPTION '결과 품목이 원본 BOM과 일치하지 않습니다';
  END IF;

  -- 2. 최대 버전 조회 (FOR UPDATE로 동시성 보장)
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM bom_headers
  WHERE product_item_id = v_product_item_id
  FOR UPDATE;

  -- 3. 구버전 비활성화
  UPDATE bom_headers
  SET is_active = false
  WHERE product_item_id = v_product_item_id
    AND is_active = true;

  -- 4. 새 헤더 생성
  INSERT INTO bom_headers (company_id, product_item_id, version, is_active)
  VALUES (p_company_id, v_product_item_id, v_next_version, true)
  RETURNING id INTO v_new_header_id;

  -- 5. 라인 복사
  INSERT INTO bom_lines (bom_header_id, material_item_id, quantity, sort_order)
  SELECT v_new_header_id, material_item_id, quantity, sort_order
  FROM bom_lines
  WHERE bom_header_id = p_source_bom_id;

  RETURN v_new_header_id;
END;
$$;

-- 3. create_purchase_order 재생성
CREATE OR REPLACE FUNCTION create_purchase_order(
  p_company_id uuid,
  p_created_by uuid,
  p_po_number text,
  p_vendor_id uuid,
  p_order_date date,
  p_expected_date date DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb
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
  -- 1. 업체 소유권 검증
  IF NOT EXISTS (
    SELECT 1 FROM vendors WHERE id = p_vendor_id AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '업체를 찾을 수 없거나 권한이 없습니다: %', p_vendor_id;
  END IF;

  -- 2. 라인 품목 소유권 검증 (재고 라인만)
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_type := v_line->>'line_type';
    IF v_line_type = 'inventory' AND v_line->>'item_id' IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM items WHERE id = (v_line->>'item_id')::uuid AND company_id = p_company_id
      ) THEN
        RAISE EXCEPTION '품목을 찾을 수 없거나 권한이 없습니다: %', v_line->>'item_id';
      END IF;
    END IF;
  END LOOP;

  -- 3. 총액 계산 (DB에서 정확한 numeric 연산)
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

  -- 4. PO 헤더 생성
  INSERT INTO purchase_orders (
    company_id, po_number, vendor_id, order_date,
    expected_date, notes, total_amount, created_by
  ) VALUES (
    p_company_id, p_po_number, p_vendor_id, p_order_date,
    p_expected_date, p_notes, v_total_amount, p_created_by
  )
  RETURNING id INTO v_po_id;

  -- 5. PO 라인 생성
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
