-- supabase_auth_admin이 profiles를 읽을 수 있도록 RLS 정책 추가
-- custom_access_token_hook이 JWT에 role/company_id를 주입하려면
-- profiles 테이블을 읽어야 하는데, RLS가 이를 차단하고 있었음

DROP POLICY IF EXISTS "allow_auth_admin_read_profiles" ON profiles;
CREATE POLICY "allow_auth_admin_read_profiles" ON profiles
  FOR SELECT
  TO supabase_auth_admin
  USING (true);
