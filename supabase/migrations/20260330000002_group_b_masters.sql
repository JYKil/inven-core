-- 그룹 B: 기초 마스터 (거래처, 창고, 품목, BOM)

-- partners (거래처)
CREATE TABLE partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name varchar(200) NOT NULL,
  partner_type varchar(20) NOT NULL DEFAULT 'both'
    CHECK (partner_type IN ('supplier', 'customer', 'both')),
  business_number varchar(20),
  contact_name varchar(100),
  phone varchar(20),
  email varchar(255),
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_partners_company_id ON partners(company_id);

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- warehouses (창고)
CREATE TABLE warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code varchar(20) NOT NULL,
  name varchar(200) NOT NULL,
  location text,
  phone varchar(20),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX idx_warehouses_company_id ON warehouses(company_id);

CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- items (품목)
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code varchar(50) NOT NULL,
  name varchar(200) NOT NULL,
  category varchar(100),
  unit varchar(20) NOT NULL DEFAULT 'EA',
  item_type varchar(20) NOT NULL DEFAULT 'basic'
    CHECK (item_type IN ('basic', 'assembly')),
  description text,
  min_stock_qty numeric(15,4) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX idx_items_company_id ON items(company_id);

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- bom_headers (BOM 정의)
CREATE TABLE bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  product_item_id uuid NOT NULL REFERENCES items(id),
  version int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_item_id, version)
);

CREATE INDEX idx_bom_headers_company_id ON bom_headers(company_id);

CREATE TRIGGER bom_headers_updated_at
  BEFORE UPDATE ON bom_headers
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- bom_lines (BOM 구성 재료)
CREATE TABLE bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_header_id uuid NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  material_item_id uuid NOT NULL REFERENCES items(id),
  quantity numeric(15,4) NOT NULL CHECK (quantity > 0),
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (bom_header_id, material_item_id)
);
