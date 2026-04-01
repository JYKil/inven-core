-- create_reference_code RPC에 auth.uid() 검증 추가
-- 기존 CREATE OR REPLACE로 함수 재정의

CREATE OR REPLACE FUNCTION create_reference_code(
  p_code_type varchar,
  p_code_data1 varchar,
  p_code_data2 varchar DEFAULT NULL,
  p_code_data3 varchar DEFAULT NULL,
  p_code_data4 varchar DEFAULT NULL,
  p_code_data5 varchar DEFAULT NULL,
  p_code_data6 varchar DEFAULT NULL,
  p_code_data7 varchar DEFAULT NULL,
  p_code_data8 varchar DEFAULT NULL,
  p_code_data9 varchar DEFAULT NULL,
  p_sort_order int DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_company_id uuid;
  v_sort_order int;
  v_id uuid;
BEGIN
  -- 인증 확인
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다';
  END IF;

  -- 회사 확인
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '회사 정보를 찾을 수 없습니다';
  END IF;

  -- sort_order 원자적 계산
  IF p_sort_order IS NOT NULL THEN
    v_sort_order := p_sort_order;
  ELSE
    SELECT COALESCE(MAX(rc.sort_order), 0) + 1
    INTO v_sort_order
    FROM reference_codes rc
    WHERE rc.company_id = v_company_id
      AND rc.code_type = p_code_type
      AND rc.is_active = true;
  END IF;

  INSERT INTO reference_codes (
    company_id, code_type, code_data1, code_data2, code_data3,
    code_data4, code_data5, code_data6, code_data7, code_data8,
    code_data9, sort_order
  ) VALUES (
    v_company_id, p_code_type, p_code_data1, p_code_data2, p_code_data3,
    p_code_data4, p_code_data5, p_code_data6, p_code_data7, p_code_data8,
    p_code_data9, v_sort_order
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
