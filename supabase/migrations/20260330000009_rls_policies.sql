-- RLS 정책: 모든 비즈니스 테이블에 멀티테넌시 격리 적용
-- JWT app_metadata에서 company_id, role을 직접 읽어 profiles 서브쿼리 불필요

-- === 헬퍼 함수 (public 스키마) ===

-- JWT에서 company_id 추출
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT ((auth.jwt()->'app_metadata'->>'company_id'))::uuid;
$$;

-- JWT에서 role 추출
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'role');
$$;

-- === 그룹 A: companies ===

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_tenant_isolation" ON companies
  FOR ALL USING (
    id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

-- === 그룹 A: profiles ===

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 같은 회사 프로필 조회 가능
CREATE POLICY "profiles_tenant_isolation" ON profiles
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
    OR id = auth.uid()  -- 자기 자신은 항상 조회 가능
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
    OR id = auth.uid()
  );

-- === 그룹 B: 기초 마스터 ===

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_tenant_isolation" ON partners
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouses_tenant_isolation" ON warehouses
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items_tenant_isolation" ON items
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE bom_headers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_headers_tenant_isolation" ON bom_headers
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE bom_lines ENABLE ROW LEVEL SECURITY;

-- bom_lines는 company_id가 없으므로 부모(bom_headers) 조인
CREATE POLICY "bom_lines_tenant_isolation" ON bom_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bom_headers
      WHERE bom_headers.id = bom_lines.bom_header_id
        AND (bom_headers.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bom_headers
      WHERE bom_headers.id = bom_lines.bom_header_id
        AND (bom_headers.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

-- === 그룹 C: 구매/입고 ===

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_tenant_isolation" ON purchase_orders
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_lines_tenant_isolation" ON purchase_order_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_lines.po_id
        AND (purchase_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_lines.po_id
        AND (purchase_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goods_receipts_tenant_isolation" ON goods_receipts
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE goods_receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goods_receipt_lines_tenant_isolation" ON goods_receipt_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM goods_receipts
      WHERE goods_receipts.id = goods_receipt_lines.receipt_id
        AND (goods_receipts.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goods_receipts
      WHERE goods_receipts.id = goods_receipt_lines.receipt_id
        AND (goods_receipts.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

ALTER TABLE po_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "po_payments_tenant_isolation" ON po_payments
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

-- === 그룹 D: 재고 ===

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_transactions_tenant_isolation" ON inventory_transactions
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_lots_tenant_isolation" ON inventory_lots
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE inventory_lot_consumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_lot_consumptions_tenant_isolation" ON inventory_lot_consumptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM inventory_lots
      WHERE inventory_lots.id = inventory_lot_consumptions.lot_id
        AND (inventory_lots.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_lots
      WHERE inventory_lots.id = inventory_lot_consumptions.lot_id
        AND (inventory_lots.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

ALTER TABLE inventory_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_summary_tenant_isolation" ON inventory_summary
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

-- === 그룹 E: 조립 ===

ALTER TABLE assembly_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assembly_orders_tenant_isolation" ON assembly_orders
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE assembly_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assembly_order_lines_tenant_isolation" ON assembly_order_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assembly_orders
      WHERE assembly_orders.id = assembly_order_lines.assembly_order_id
        AND (assembly_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assembly_orders
      WHERE assembly_orders.id = assembly_order_lines.assembly_order_id
        AND (assembly_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

-- === 그룹 F: 영업 ===

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_orders_tenant_isolation" ON sales_orders
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE sales_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_order_lines_tenant_isolation" ON sales_order_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_lines.sales_order_id
        AND (sales_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales_orders
      WHERE sales_orders.id = sales_order_lines.sales_order_id
        AND (sales_orders.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );

-- === 그룹 G: 창고 이동 ===

ALTER TABLE warehouse_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_transfers_tenant_isolation" ON warehouse_transfers
  FOR ALL USING (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  )
  WITH CHECK (
    company_id = public.get_my_company_id()
    OR public.get_my_role() = 'super_admin'
  );

ALTER TABLE warehouse_transfer_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_transfer_lines_tenant_isolation" ON warehouse_transfer_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM warehouse_transfers
      WHERE warehouse_transfers.id = warehouse_transfer_lines.transfer_id
        AND (warehouse_transfers.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM warehouse_transfers
      WHERE warehouse_transfers.id = warehouse_transfer_lines.transfer_id
        AND (warehouse_transfers.company_id = public.get_my_company_id() OR public.get_my_role() = 'super_admin')
    )
  );
