-- super_admin 전용: 회사 생성 RPC (프로필 생성 없이 회사만 생성)
-- 관리자 페이지에서 사용 — RLS 우회를 위해 SECURITY DEFINER 사용

CREATE OR REPLACE FUNCTION admin_create_company(
  p_name text,
  p_business_number text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_phone text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
BEGIN
  -- super_admin 권한 확인
  v_role := (auth.jwt()->'app_metadata'->>'role');
  IF v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'super_admin 권한이 필요합니다';
  END IF;

  INSERT INTO companies (name, business_number, address, phone)
  VALUES (p_name, p_business_number, p_address, p_phone)
  RETURNING id INTO v_company_id;

  RETURN v_company_id;
END;
$$;
