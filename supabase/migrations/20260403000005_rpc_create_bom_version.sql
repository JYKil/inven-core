-- BOM 새 버전 생성 RPC: 구버전 비활성 + 신버전 생성 + 라인 복사를 단일 트랜잭션으로
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 검증

CREATE OR REPLACE FUNCTION create_bom_version(
  p_company_id uuid,
  p_source_bom_id uuid,
  p_product_item_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_header_company uuid;
  v_next_version int;
  v_new_header_id uuid;
BEGIN
  -- 1. 원본 BOM 소유권 검증
  SELECT company_id INTO v_header_company
  FROM bom_headers
  WHERE id = p_source_bom_id;

  IF v_header_company IS NULL THEN
    RAISE EXCEPTION 'BOM을 찾을 수 없습니다: %', p_source_bom_id;
  END IF;

  IF v_header_company != p_company_id THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 2. 최대 버전 조회 (FOR UPDATE로 동시성 보장)
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM bom_headers
  WHERE product_item_id = p_product_item_id
  FOR UPDATE;

  -- 3. 구버전 비활성화
  UPDATE bom_headers
  SET is_active = false
  WHERE product_item_id = p_product_item_id
    AND is_active = true;

  -- 4. 새 헤더 생성
  INSERT INTO bom_headers (company_id, product_item_id, version, is_active)
  VALUES (p_company_id, p_product_item_id, v_next_version, true)
  RETURNING id INTO v_new_header_id;

  -- 5. 라인 복사
  INSERT INTO bom_lines (bom_header_id, material_item_id, quantity, sort_order)
  SELECT v_new_header_id, material_item_id, quantity, sort_order
  FROM bom_lines
  WHERE bom_header_id = p_source_bom_id;

  RETURN v_new_header_id;
END;
$$;
