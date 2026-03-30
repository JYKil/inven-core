-- BOM 라인 전체 교체 RPC: delete → insert를 단일 트랜잭션으로 보장
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 검증

CREATE OR REPLACE FUNCTION update_bom_lines(
  p_bom_header_id uuid,
  p_company_id uuid,
  p_lines jsonb  -- [{ material_item_id, quantity, sort_order }]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line jsonb;
  v_header_company uuid;
BEGIN
  -- 1. BOM 헤더 소유권 검증
  SELECT company_id INTO v_header_company
  FROM bom_headers
  WHERE id = p_bom_header_id AND is_active = true;

  IF v_header_company IS NULL THEN
    RAISE EXCEPTION 'BOM을 찾을 수 없습니다: %', p_bom_header_id;
  END IF;

  IF v_header_company != p_company_id THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 2. 기존 라인 삭제
  DELETE FROM bom_lines WHERE bom_header_id = p_bom_header_id;

  -- 3. 새 라인 삽입
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO bom_lines (bom_header_id, material_item_id, quantity, sort_order)
    VALUES (
      p_bom_header_id,
      (v_line->>'material_item_id')::uuid,
      (v_line->>'quantity')::numeric,
      COALESCE((v_line->>'sort_order')::int, 0)
    );
  END LOOP;
END;
$$;
