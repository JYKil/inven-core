-- Phase 4: RLS 정책을 앱 레이어 권한 체크로 대체
-- 서버 API가 Better Auth 세션의 role/companyId로 tenant filter와 권한 체크를 적용한다.

DO $$
DECLARE
  table_name text;
  policy_name text;
  tables text[] := ARRAY[
    'companies',
    'profiles',
    'partners',
    'items',
    'warehouses',
    'vendors',
    'customers',
    'reference_codes',
    'bom_headers',
    'bom_lines',
    'purchase_orders',
    'purchase_order_lines',
    'goods_receipts',
    'goods_receipt_lines',
    'po_payments',
    'inventory_transactions',
    'inventory_lots',
    'inventory_lot_consumptions',
    'inventory_summary',
    'assembly_orders',
    'assembly_order_lines',
    'sales_orders',
    'sales_order_lines',
    'warehouse_transfers',
    'warehouse_transfer_lines'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      FOR policy_name IN
        SELECT p.policyname
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = table_name
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
      END LOOP;

      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;
