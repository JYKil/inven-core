-- 그룹 A: 회사 + 사용자 프로필

-- companies (회사)
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  business_number varchar(20) UNIQUE,
  address text,
  phone varchar(20),
  costing_method varchar(20) NOT NULL DEFAULT 'FIFO'
    CHECK (costing_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVG')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- profiles (사용자 프로필, auth.users 1:1)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  role varchar(20) NOT NULL DEFAULT 'normal'
    CHECK (role IN ('super_admin', 'company_admin', 'normal')),
  display_name varchar(100),
  email varchar(255) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- super_admin은 company_id NULL, 나머지는 NOT NULL
  CONSTRAINT profiles_role_company_check
    CHECK (
      (role = 'super_admin' AND company_id IS NULL)
      OR (role != 'super_admin' AND company_id IS NOT NULL)
    )
);

CREATE INDEX idx_profiles_company_id ON profiles(company_id);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
