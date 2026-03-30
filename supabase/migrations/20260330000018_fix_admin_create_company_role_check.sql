-- admin_create_company: JWT 의존 제거, profiles 테이블 직접 조회로 변경

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
  -- profiles 테이블에서 직접 역할 확인 (JWT 의존 제거)
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'super_admin 권한이 필요합니다';
  END IF;

  INSERT INTO companies (name, business_number, address, phone)
  VALUES (p_name, p_business_number, p_address, p_phone)
  RETURNING id INTO v_company_id;

  RETURN v_company_id;
END;
$$;
