-- 그룹 C: 구매/입고 (발주서, 입고, 지급)

-- purchase_orders (발주서)
CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  po_number varchar(50) NOT NULL,
  partner_id uuid NOT NULL REFERENCES partners(id),
  order_date date NOT NULL,
  expected_date date,
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'partially_received', 'received', 'cancelled')),
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, po_number)
);

CREATE INDEX idx_po_company_status ON purchase_orders(company_id, status);

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- purchase_order_lines (발주 라인)
CREATE TABLE purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id),
  ordered_qty numeric(15,4) NOT NULL CHECK (ordered_qty > 0),
  received_qty numeric(15,4) NOT NULL DEFAULT 0 CHECK (received_qty >= 0),
  unit_price numeric(18,4) NOT NULL CHECK (unit_price >= 0),
  line_amount numeric(18,2) NOT NULL
);

-- goods_receipts (입고)
CREATE TABLE goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  receipt_number varchar(50) NOT NULL,
  po_id uuid REFERENCES purchase_orders(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  receipt_date date NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, receipt_number)
);

CREATE TRIGGER goods_receipts_updated_at
  BEFORE UPDATE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- goods_receipt_lines (입고 라인)
CREATE TABLE goods_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_line_id uuid REFERENCES purchase_order_lines(id),
  item_id uuid NOT NULL REFERENCES items(id),
  quantity numeric(15,4) NOT NULL CHECK (quantity > 0),
  unit_price numeric(18,4) NOT NULL CHECK (unit_price >= 0)
);

-- po_payments (PO 지급)
CREATE TABLE po_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  po_id uuid NOT NULL REFERENCES purchase_orders(id),
  payment_date date NOT NULL,
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  payment_method varchar(50),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_po_payments_po_id ON po_payments(po_id);
