-- purchase_order_lines에 line_type(재고/비용) + description(비용 매입품명) 추가
-- 비용 타입은 품목 없이 금액만 입력하므로 item_id NULLABLE로 변경

-- 1. line_type 추가 (기존 데이터는 모두 'inventory')
ALTER TABLE purchase_order_lines
ADD COLUMN line_type varchar(20) NOT NULL DEFAULT 'inventory'
CHECK (line_type IN ('inventory', 'expense'));

-- 2. 비용 타입 매입품명 저장용
ALTER TABLE purchase_order_lines
ADD COLUMN description varchar(200);

-- 3. 비용 타입은 품목이 아니므로 item_id NULLABLE
ALTER TABLE purchase_order_lines ALTER COLUMN item_id DROP NOT NULL;

-- 4. 비용 타입은 수량 0 허용 (기존: ordered_qty > 0)
ALTER TABLE purchase_order_lines DROP CONSTRAINT purchase_order_lines_ordered_qty_check;
ALTER TABLE purchase_order_lines ADD CONSTRAINT purchase_order_lines_ordered_qty_check
  CHECK (line_type = 'expense' OR ordered_qty > 0);
