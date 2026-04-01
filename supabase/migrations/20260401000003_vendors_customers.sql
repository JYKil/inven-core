-- 업체(vendors) + 고객(customers) 분리 — partners 테이블 대체
-- 실행 순서: 1) 테이블 생성 → 2) FK 마이그레이션 → 3) RPC 수정 → 4) partners DROP

BEGIN;

-- =====================
-- 1. vendors 테이블
-- =====================
CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name varchar(200) NOT NULL,
  business_number varchar(20),
  address text,
  bank_name varchar(100),
  bank_code varchar(20),
  account_number varchar(50),
  account_holder varchar(100),
  payment_currency varchar(10) NOT NULL DEFAULT 'KRW',
  contact_email varchar(255),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_vendors_company ON vendors(company_id);

-- RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY vendors_select ON vendors FOR SELECT
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY vendors_insert ON vendors FOR INSERT
  WITH CHECK (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY vendors_update ON vendors FOR UPDATE
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY vendors_delete ON vendors FOR DELETE
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);

-- super_admin bypass
CREATE POLICY vendors_super_admin ON vendors FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') = 'super_admin');

-- moddatetime
CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- =====================
-- 2. customers 테이블
-- =====================
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name varchar(200) NOT NULL,
  business_number varchar(20),
  address text,
  receipt_currency varchar(10) NOT NULL DEFAULT 'USD',
  contact_email varchar(255),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE INDEX idx_customers_company ON customers(company_id);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON customers FOR SELECT
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (company_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'company_id')::uuid);

-- super_admin bypass
CREATE POLICY customers_super_admin ON customers FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'user_role') = 'super_admin');

-- moddatetime
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- =====================
-- 3. 초기 데이터 적재 (t1 테넌트 + kilga naver 회사)
-- =====================

-- t1 테넌트의 company_id 조회하여 삽입
DO $$
DECLARE
  v_company_id uuid;
BEGIN
  -- 각 회사별 vendor/customer 초기 데이터
  FOR v_company_id IN
    SELECT id FROM companies
  LOOP
    -- Vendors
    INSERT INTO vendors (company_id, name, business_number, address, bank_name, bank_code, account_number, account_holder, payment_currency, contact_email)
    VALUES
      (v_company_id, 'Vendor A', '567-89-01234', 'Seoul, Korea', 'Kookmin', 'A123', '12345', 'Daesun', 'KRW', 'vendora@gmail.com'),
      (v_company_id, 'Vendor B', '111-22-33333', 'Guangzhou, China', 'HSBC', 'B123', '23456789', 'Jaeyong', 'USD', 'vendorb@gmail.com'),
      (v_company_id, 'Vendor C', '222-33-44444', 'Atlanta, USA', 'Chase', 'C123', '3456789', 'Yonghun', 'USD', 'vendorc@gmail.com')
    ON CONFLICT (company_id, name) DO NOTHING;

    -- Customers
    INSERT INTO customers (company_id, name, business_number, address, receipt_currency, contact_email)
    VALUES
      (v_company_id, 'Amazon', '123-45-67890', 'California, USA', 'USD', 'amazon@gmail.com'),
      (v_company_id, 'Walmart', '234-56-78901', 'Arkansas, USA', 'USD', 'walmart@gmail.com')
    ON CONFLICT (company_id, name) DO NOTHING;
  END LOOP;
END $$;

-- =====================
-- 4. FK 마이그레이션
-- =====================

-- purchase_orders: partner_id → vendor_id
-- 먼저 기존 partner_id 데이터를 vendor로 매핑 (같은 이름 기준)
ALTER TABLE purchase_orders ADD COLUMN vendor_id uuid;

UPDATE purchase_orders po
SET vendor_id = v.id
FROM partners p
JOIN vendors v ON v.company_id = p.company_id AND v.name = p.name
WHERE po.partner_id = p.id;

-- partner_id가 있지만 매핑 안 된 경우 — 첫 번째 vendor로 대체
UPDATE purchase_orders po
SET vendor_id = (
  SELECT v.id FROM vendors v WHERE v.company_id = po.company_id LIMIT 1
)
WHERE po.vendor_id IS NULL AND po.partner_id IS NOT NULL;

ALTER TABLE purchase_orders ALTER COLUMN vendor_id SET NOT NULL;
ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_partner_id_fkey;
ALTER TABLE purchase_orders DROP COLUMN partner_id;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES vendors(id);

-- sales_orders: partner_id → customer_id
ALTER TABLE sales_orders ADD COLUMN customer_id uuid;

UPDATE sales_orders so
SET customer_id = c.id
FROM partners p
JOIN customers c ON c.company_id = p.company_id AND c.name = p.name
WHERE so.partner_id = p.id;

-- 매핑 안 된 경우 — 첫 번째 customer로 대체
UPDATE sales_orders so
SET customer_id = (
  SELECT c.id FROM customers c WHERE c.company_id = so.company_id LIMIT 1
)
WHERE so.customer_id IS NULL AND so.partner_id IS NOT NULL;

ALTER TABLE sales_orders ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE sales_orders DROP CONSTRAINT sales_orders_partner_id_fkey;
ALTER TABLE sales_orders DROP COLUMN partner_id;
ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES customers(id);

-- =====================
-- 5. report_sales RPC 수정 (partner → customer)
-- =====================
DROP FUNCTION IF EXISTS report_sales(uuid, date, date, uuid);
CREATE OR REPLACE FUNCTION report_sales(
  p_company_id uuid,
  p_start_date date,
  p_end_date date,
  p_customer_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH sales_data AS (
    SELECT
      so.id AS sales_order_id,
      so.order_number,
      so.order_date,
      c.name AS customer_name,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      sol.quantity,
      sol.unit_price,
      sol.line_amount,
      COALESCE(sol.cost_of_goods, 0) AS cost_of_goods,
      sol.line_amount - COALESCE(sol.cost_of_goods, 0) AS gross_profit
    FROM sales_orders so
    JOIN sales_order_lines sol ON sol.sales_order_id = so.id
    JOIN customers c ON c.id = so.customer_id
    JOIN items i ON i.id = sol.item_id
    WHERE so.company_id = p_company_id
      AND so.status = 'shipped'
      AND so.order_date >= p_start_date
      AND so.order_date <= p_end_date
      AND (p_customer_id IS NULL OR so.customer_id = p_customer_id)
    ORDER BY so.order_date, so.order_number
  ),
  totals AS (
    SELECT
      COALESCE(SUM(line_amount), 0) AS total_revenue,
      COALESCE(SUM(cost_of_goods), 0) AS total_cogs,
      COALESCE(SUM(gross_profit), 0) AS total_profit,
      COALESCE(SUM(quantity), 0) AS total_quantity,
      COUNT(DISTINCT sales_order_id) AS order_count
    FROM sales_data
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date),
    'totals', (SELECT row_to_json(t) FROM totals t),
    'profit_margin', CASE
      WHEN (SELECT total_revenue FROM totals) > 0
      THEN ROUND((SELECT total_profit FROM totals) / (SELECT total_revenue FROM totals) * 100, 1)
      ELSE 0
    END,
    'lines', COALESCE((SELECT jsonb_agg(row_to_json(sd)) FROM sales_data sd), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================
-- 6. dashboard_summary RPC 수정 (partner_count → vendor_count + customer_count)
-- =====================
CREATE OR REPLACE FUNCTION dashboard_summary(
  p_company_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_month_start date;
  v_month_end date;
BEGIN
  v_month_start := date_trunc('month', current_date)::date;
  v_month_end := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;

  SELECT jsonb_build_object(
    'pending', jsonb_build_object(
      'draft_po_count', (
        SELECT count(*) FROM purchase_orders
        WHERE company_id = p_company_id AND status = 'draft'
      ),
      'draft_so_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id AND status = 'draft'
      ),
      'confirmed_so_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id AND status = 'confirmed'
      )
    ),
    'monthly_purchase', jsonb_build_object(
      'total_amount', COALESCE((
        SELECT SUM(total_amount) FROM purchase_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status NOT IN ('draft', 'cancelled')
      ), 0),
      'order_count', (
        SELECT count(*) FROM purchase_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status NOT IN ('draft', 'cancelled')
      )
    ),
    'monthly_sales', jsonb_build_object(
      'total_amount', COALESCE((
        SELECT SUM(total_amount) FROM sales_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status = 'shipped'
      ), 0),
      'total_cogs', COALESCE((
        SELECT SUM(sol.cost_of_goods)
        FROM sales_order_lines sol
        JOIN sales_orders so ON so.id = sol.sales_order_id
        WHERE so.company_id = p_company_id
          AND so.order_date >= v_month_start
          AND so.order_date <= v_month_end
          AND so.status = 'shipped'
      ), 0),
      'order_count', (
        SELECT count(*) FROM sales_orders
        WHERE company_id = p_company_id
          AND order_date >= v_month_start
          AND order_date <= v_month_end
          AND status = 'shipped'
      )
    ),
    'onboarding', jsonb_build_object(
      'vendor_count', (
        SELECT count(*) FROM vendors
        WHERE company_id = p_company_id AND is_active = true
      ),
      'customer_count', (
        SELECT count(*) FROM customers
        WHERE company_id = p_company_id AND is_active = true
      ),
      'warehouse_count', (
        SELECT count(*) FROM warehouses
        WHERE company_id = p_company_id AND is_active = true
      ),
      'item_count', (
        SELECT count(*) FROM items
        WHERE company_id = p_company_id AND is_active = true
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================
-- 7. partners 관련 RLS 정책 정리 + 테이블 DROP
-- =====================
DROP TABLE partners CASCADE;

COMMIT;
