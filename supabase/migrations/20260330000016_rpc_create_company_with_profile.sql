-- 회사 생성 + 프로필 생성을 원자적으로 처리하는 RPC
-- 온보딩에서 사용 — 프로필 생성 실패 시 고아 회사 방지

CREATE OR REPLACE FUNCTION create_company_with_profile(
  p_user_id uuid,
  p_company_name text,
  p_business_number text DEFAULT NULL,
  p_display_name text DEFAULT '',
  p_email text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- 회사 생성
  INSERT INTO companies (name, business_number)
  VALUES (p_company_name, p_business_number)
  RETURNING id INTO v_company_id;

  -- 프로필 생성 (company_admin)
  INSERT INTO profiles (id, company_id, role, display_name, email)
  VALUES (p_user_id, v_company_id, 'company_admin', p_display_name, p_email);

  RETURN v_company_id;
END;
$$;
