-- report_warehouse_stock RPC에서 삭제된 w.code 참조 제거
-- warehouse_code 컬럼이 DROP되었으므로 해당 SELECT 필드 제거

CREATE OR REPLACE FUNCTION report_warehouse_stock(
  p_company_id uuid,
  p_warehouse_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 호출자가 해당 회사 소속인지 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION '접근 권한이 없습니다';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      w.id AS warehouse_id,
      w.name AS warehouse_name,
      i.id AS item_id,
      i.code AS item_code,
      i.name AS item_name,
      i.unit,
      s.total_qty,
      s.total_value,
      CASE WHEN s.total_qty > 0
        THEN ROUND(s.total_value / s.total_qty, 4)
        ELSE 0
      END AS avg_unit_cost
    FROM inventory_summary s
    JOIN items i ON i.id = s.item_id
    JOIN warehouses w ON w.id = s.warehouse_id
    WHERE s.company_id = p_company_id
      AND s.total_qty > 0
      AND (p_warehouse_id IS NULL OR s.warehouse_id = p_warehouse_id)
    ORDER BY w.name, i.code
  ) r;

  RETURN v_result;
END;
$$;
