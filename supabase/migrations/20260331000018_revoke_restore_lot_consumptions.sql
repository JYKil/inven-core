-- restore_lot_consumptions 직접 호출 차단
-- 이 함수는 cancel_* RPC 내부에서만 호출되어야 하며,
-- 직접 호출 시 auth.uid() 검증 없이 임의 company의 로트를 복원할 수 있음 (IDOR)

REVOKE ALL ON FUNCTION restore_lot_consumptions(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION restore_lot_consumptions(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION restore_lot_consumptions(uuid, uuid) FROM anon;
