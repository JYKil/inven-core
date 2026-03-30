-- Custom Claims Hook: JWT에 company_id, role 주입
-- profiles 서브쿼리 없이 RLS에서 바로 사용 가능

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
  -- 사용자 프로필에서 company_id, role 조회
  SELECT company_id, role INTO user_company_id, user_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- app_metadata에 company_id, role 주입
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{app_metadata,company_id}', to_jsonb(user_company_id));
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  ELSE
    -- 프로필 없으면 기본값
    claims := jsonb_set(claims, '{app_metadata,company_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{app_metadata,role}', '"normal"'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Hook이 auth.users 테이블을 읽을 수 있도록 권한 부여
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- service_role도 접근 가능하도록 (RPC 등에서 필요)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
