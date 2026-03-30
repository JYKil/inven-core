-- 그룹 D: 재고 핵심 (FIFO 로트 추적, 요약, 감사 로그)

-- inventory_transactions (재고 변동 감사 로그) — lots보다 먼저 생성 (consumption FK 때문)
CREATE TABLE inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  transaction_type varchar(30) NOT NULL
    CHECK (transaction_type IN (
      'purchase_in', 'assembly_in', 'assembly_out',
      'sale_out', 'transfer_in', 'transfer_out', 'adjustment'
    )),
  quantity numeric(15,4) NOT NULL,
  unit_cost numeric(18,4),
  total_cost numeric(18,2),
  reference_type varchar(30),
  reference_id uuid,
  transaction_date timestamptz NOT NULL,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_txn_item_date ON inventory_transactions(company_id, item_id, transaction_date);
CREATE INDEX idx_txn_reference ON inventory_transactions(reference_type, reference_id);

-- inventory_lots (로트 — FIFO/LIFO 추적의 핵심)
CREATE TABLE inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  lot_date timestamptz NOT NULL,
  unit_cost numeric(18,4) NOT NULL CHECK (unit_cost >= 0),
  initial_qty numeric(15,4) NOT NULL CHECK (initial_qty > 0),
  remaining_qty numeric(15,4) NOT NULL CHECK (remaining_qty >= 0),
  source_type varchar(20) NOT NULL
    CHECK (source_type IN ('purchase', 'assembly', 'transfer_in')),
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FIFO 최적화 인덱스 (잔여 수량 있는 로트만)
CREATE INDEX idx_lots_fifo
  ON inventory_lots(company_id, item_id, warehouse_id, lot_date ASC)
  WHERE remaining_qty > 0;

-- LIFO 최적화 인덱스
CREATE INDEX idx_lots_lifo
  ON inventory_lots(company_id, item_id, warehouse_id, lot_date DESC)
  WHERE remaining_qty > 0;

-- inventory_lot_consumptions (로트 소비 이력)
CREATE TABLE inventory_lot_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES inventory_lots(id),
  consumed_qty numeric(15,4) NOT NULL CHECK (consumed_qty > 0),
  transaction_id uuid NOT NULL REFERENCES inventory_transactions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lot_consumptions_lot_id ON inventory_lot_consumptions(lot_id);
CREATE INDEX idx_lot_consumptions_txn_id ON inventory_lot_consumptions(transaction_id);

-- inventory_summary (현재고 요약 캐시)
CREATE TABLE inventory_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  item_id uuid NOT NULL REFERENCES items(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  total_qty numeric(15,4) NOT NULL DEFAULT 0,
  total_value numeric(18,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, item_id, warehouse_id)
);
