-- 단가 소수점 5자리 지원을 위해 precision 변경 (18,4 → 18,5)
ALTER TABLE purchase_order_lines ALTER COLUMN unit_price TYPE numeric(18,5);
ALTER TABLE goods_receipt_lines ALTER COLUMN unit_price TYPE numeric(18,5);
