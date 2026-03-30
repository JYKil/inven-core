-- 그룹 E: 조립 (BOM 생산)

-- assembly_orders (조립 지시)
CREATE TABLE assembly_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  order_number varchar(50) NOT NULL,
  bom_header_id uuid NOT NULL REFERENCES bom_headers(id),
  product_item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric(15,4) NOT NULL CHECK (quantity > 0),
  total_cost numeric(18,2),
  unit_cost numeric(18,4),
  assembly_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE TRIGGER assembly_orders_updated_at
  BEFORE UPDATE ON assembly_orders
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- assembly_order_lines (조립 재료 상세)
CREATE TABLE assembly_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_order_id uuid NOT NULL REFERENCES assembly_orders(id) ON DELETE CASCADE,
  material_item_id uuid NOT NULL REFERENCES items(id),
  required_qty numeric(15,4) NOT NULL,
  consumed_qty numeric(15,4) NOT NULL DEFAULT 0,
  consumed_cost numeric(18,2) NOT NULL DEFAULT 0
);
