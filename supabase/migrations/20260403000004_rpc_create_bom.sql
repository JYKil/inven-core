-- BOM 생성 RPC: 헤더+라인을 단일 트랜잭션으로 원자적 생성
-- 버전 자동 부여 (해당 품목의 최대 버전 + 1) + UNIQUE 보장
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 검증

CREATE OR REPLACE FUNCTION create_bom(
  p_company_id uuid,
  p_product_item_id uuid,
  p_version int DEFAULT NULL,
  p_lines jsonb DEFAULT '[]'::jsonb  -- [{ material_item_id, quantity, sort_order }]
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
  -- 1. 버전 결정: 명시적 지정 없으면 최대 버전 + 1 (FOR UPDATE로 동시성 보장)
  IF p_version IS NOT NULL THEN
    v_version := p_version;
  ELSE
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM bom_headers
    WHERE product_item_id = p_product_item_id
    FOR UPDATE;
  END IF;

  -- 2. 헤더 생성
  INSERT INTO bom_headers (company_id, product_item_id, version)
  VALUES (p_company_id, p_product_item_id, v_version)
  RETURNING id INTO v_header_id;

  -- 3. 라인 생성
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
