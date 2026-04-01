-- 기준정보(Reference Codes) 테이블
-- 운송수단, Shipping Package, Material 등 범용 코드 관리

CREATE TABLE reference_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code_type varchar(100) NOT NULL,
  code_data1 varchar(500) NOT NULL,
  code_data2 varchar(500),
  code_data3 varchar(500),
  code_data4 varchar(500),
  code_data5 varchar(500),
  code_data6 varchar(500),
  code_data7 varchar(500),
  code_data8 varchar(500),
  code_data9 varchar(500),
  sort_order int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 활성 레코드만 유니크 (소프트 삭제된 레코드는 제외)
CREATE UNIQUE INDEX idx_reference_codes_unique_active
  ON reference_codes(company_id, code_type, code_data1) WHERE is_active = true;

-- 조회 성능 인덱스
CREATE INDEX idx_reference_codes_company_type
  ON reference_codes(company_id, code_type);

-- moddatetime 트리거
CREATE TRIGGER set_reference_codes_updated_at
  BEFORE UPDATE ON reference_codes
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- RLS 정책
ALTER TABLE reference_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reference_codes_tenant_isolation" ON reference_codes
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );
