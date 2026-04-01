-- vendors/customers RLS 정책 수정
-- 기존 테이블과 동일하게 get_my_company_id() 사용
-- (current_setting('request.jwt.claims') 방식은 app_metadata 기반 JWT와 불일치)

-- === vendors ===
DROP POLICY IF EXISTS vendors_select ON vendors;
DROP POLICY IF EXISTS vendors_insert ON vendors;
DROP POLICY IF EXISTS vendors_update ON vendors;
DROP POLICY IF EXISTS vendors_delete ON vendors;
DROP POLICY IF EXISTS vendors_super_admin ON vendors;

CREATE POLICY vendors_tenant_isolation ON vendors
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

-- === customers ===
DROP POLICY IF EXISTS customers_select ON customers;
DROP POLICY IF EXISTS customers_insert ON customers;
DROP POLICY IF EXISTS customers_update ON customers;
DROP POLICY IF EXISTS customers_delete ON customers;
DROP POLICY IF EXISTS customers_super_admin ON customers;

CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );
