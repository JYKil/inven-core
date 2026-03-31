-- 롤백/취소 기능을 위한 컬럼 추가
-- 각 트랜잭션 헤더 테이블에 cancelled_at, cancel_reason 컬럼 추가

-- goods_receipts
ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- sales_orders (출고 취소용)
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS cancelled_shipment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- assembly_orders
ALTER TABLE assembly_orders
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- warehouse_transfers
ALTER TABLE warehouse_transfers
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
