-- pending role 추가: 회원가입 후 super_admin 승인 대기 상태
-- pending은 company_id IS NULL 허용 (아직 회사 미배정)

-- 1. role CHECK 제약 수정 (pending 추가)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'company_admin', 'normal', 'pending'));

-- 2. company_id 제약 수정 (pending도 NULL 허용)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_company_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_company_check
  CHECK (
    (role IN ('super_admin', 'pending') AND company_id IS NULL)
    OR (role NOT IN ('super_admin', 'pending') AND company_id IS NOT NULL)
  );

-- 3. custom_access_token_hook 수정: 프로필 없을 때 기본값 'pending'
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  user_company_id uuid;
  user_role text;
BEGIN
  SELECT company_id, role INTO user_company_id, user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,company_id}', COALESCE(to_jsonb(user_company_id), 'null'::jsonb));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  ELSE
    -- 프로필 없으면 pending (승인 대기)
    claims := jsonb_set(claims, '{app_metadata,company_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{app_metadata,role}', '"pending"'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
