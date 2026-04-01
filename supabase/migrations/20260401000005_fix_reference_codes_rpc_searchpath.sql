-- reference-codes RPC: SET search_path = public 추가 (SECURITY DEFINER 보안 강화)

CREATE OR REPLACE FUNCTION get_reference_code_types()
RETURNS TABLE(code_type varchar) AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT rc.code_type
    FROM reference_codes rc
    WHERE rc.company_id = public.get_my_company_id()
      AND rc.is_active = true
    ORDER BY rc.code_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_reference_code_types() FROM public;
GRANT EXECUTE ON FUNCTION get_reference_code_types() TO authenticated;

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
  -- 인증 + 회사 확인
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_reference_code(varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) FROM public;
GRANT EXECUTE ON FUNCTION create_reference_code(varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) TO authenticated;
