-- PO 지급 등록 RPC: 누적 지급액 <= 총액 검증 (동시성 안전)
-- SECURITY DEFINER: RLS 우회, company_id는 함수 내부에서 직접 검증

CREATE OR REPLACE FUNCTION create_po_payment(
  p_company_id uuid,
  p_po_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_company uuid;
  v_total_amount numeric;
  v_paid_total numeric;
  v_payment_id uuid;
BEGIN
  -- 1. PO 소유권 검증 + 총액 조회 (FOR UPDATE로 동시 지급 방지)
  SELECT company_id, total_amount INTO v_po_company, v_total_amount
  FROM purchase_orders
  WHERE id = p_po_id
  FOR UPDATE;

  IF v_po_company IS NULL THEN
    RAISE EXCEPTION '발주서를 찾을 수 없습니다: %', p_po_id;
  END IF;

  IF v_po_company != p_company_id THEN
    RAISE EXCEPTION '권한이 없습니다';
  END IF;

  -- 2. 금액 검증
  IF p_amount <= 0 THEN
    RAISE EXCEPTION '지급 금액은 0보다 커야 합니다';
  END IF;

  -- 3. 누적 지급액 조회
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_total
  FROM po_payments
  WHERE po_id = p_po_id;

  -- 4. 초과 지급 방지
  IF v_paid_total + p_amount > v_total_amount THEN
    RAISE EXCEPTION '지급 총액(%)이 발주 금액(%)을 초과합니다',
      v_paid_total + p_amount, v_total_amount;
  END IF;

  -- 5. 지급 등록
  INSERT INTO po_payments (
    company_id, po_id, payment_date, amount,
    payment_method, notes
  ) VALUES (
    p_company_id, p_po_id, p_payment_date, p_amount,
    p_payment_method, p_notes
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;
