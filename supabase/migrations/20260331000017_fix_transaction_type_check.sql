-- 취소 트랜잭션 타입 CHECK 제약조건 수정
--
-- 원인: inventory_transactions.transaction_type CHECK 제약조건이
--       원본 7개 타입만 허용하고 cancel 타입 6개를 포함하지 않음
--       → cancel RPC 호출 시 PostgreSQL 23514 에러 발생
--
-- 수정: cancel 타입 6개 추가

ALTER TABLE inventory_transactions
  DROP CONSTRAINT IF EXISTS inventory_transactions_transaction_type_check;

ALTER TABLE inventory_transactions
  ADD CONSTRAINT inventory_transactions_transaction_type_check
  CHECK (transaction_type IN (
    'purchase_in', 'assembly_in', 'assembly_out',
    'sale_out', 'transfer_in', 'transfer_out', 'adjustment',
    'purchase_in_cancel', 'assembly_in_cancel', 'assembly_out_cancel',
    'sale_out_cancel', 'transfer_in_cancel', 'transfer_out_cancel'
  ));
