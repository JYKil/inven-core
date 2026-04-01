-- 기준정보 RPC: update/soft_delete + create UNIQUE 에러 한글화

-- 1. create_reference_code — UNIQUE 위반 시 한글 에러 메시지
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
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '회사 정보를 찾을 수 없습니다';
  END IF;

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

  BEGIN
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
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION '이미 등록된 코드입니다 (타입: %, 데이터1: %)', p_code_type, p_code_data1;
  END;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION create_reference_code(varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) FROM public;
GRANT EXECUTE ON FUNCTION create_reference_code(varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) TO authenticated;

-- 2. update_reference_code — 데이터 필드만 수정 가능 (is_active, company_id 보호)
CREATE OR REPLACE FUNCTION update_reference_code(
  p_id uuid,
  p_code_data1 varchar DEFAULT NULL,
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
RETURNS void AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '회사 정보를 찾을 수 없습니다';
  END IF;

  UPDATE reference_codes
  SET
    code_data1 = COALESCE(p_code_data1, code_data1),
    code_data2 = p_code_data2,
    code_data3 = p_code_data3,
    code_data4 = p_code_data4,
    code_data5 = p_code_data5,
    code_data6 = p_code_data6,
    code_data7 = p_code_data7,
    code_data8 = p_code_data8,
    code_data9 = p_code_data9,
    sort_order = COALESCE(p_sort_order, sort_order)
  WHERE id = p_id
    AND company_id = v_company_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION '수정할 기준정보를 찾을 수 없습니다';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION '이미 등록된 코드입니다';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION update_reference_code(uuid, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) FROM public;
GRANT EXECUTE ON FUNCTION update_reference_code(uuid, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, varchar, int) TO authenticated;

-- 3. soft_delete_reference_code — is_active = false (소프트 삭제 전용)
CREATE OR REPLACE FUNCTION soft_delete_reference_code(p_id uuid)
RETURNS void AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := public.get_my_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION '회사 정보를 찾을 수 없습니다';
  END IF;

  UPDATE reference_codes
  SET is_active = false
  WHERE id = p_id
    AND company_id = v_company_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION '삭제할 기준정보를 찾을 수 없습니다';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION soft_delete_reference_code(uuid) FROM public;
GRANT EXECUTE ON FUNCTION soft_delete_reference_code(uuid) TO authenticated;
