-- 그룹 G: 창고 간 이동

-- warehouse_transfers (이동 전표)
CREATE TABLE warehouse_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  transfer_number varchar(50) NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  transfer_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, transfer_number),
  CHECK (from_warehouse_id != to_warehouse_id)
);

-- warehouse_transfer_lines (이동 라인)
CREATE TABLE warehouse_transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  quantity numeric(15,4) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(18,4)
);
