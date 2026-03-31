# 슬라이스 5 코드 리뷰 결과

## CRITICAL (3건)

### [C1] SECURITY DEFINER RPC — 타 회사 데이터 열람 가능 (confidence: 9/10)
보고서 3종 + 대시보드 2종 RPC가 SECURITY DEFINER로 실행되면서 p_company_id를
클라이언트에서 직접 받음. use-reports.ts, use-dashboard.ts에서 Supabase 클라이언트로
직접 RPC를 호출하므로, 공격자가 브라우저 콘솔에서 다른 회사 UUID를 넣어 호출하면
다른 회사의 매출/재고/대시보드 데이터를 볼 수 있음.

execute_transfer는 API route를 경유하므로 안전.

**수정 방향**: RPC 내부에서 auth.jwt() → company_id 추출, 또는 API Route 경유로 변경

### [C2] (세부 내용 누락 — 리뷰 출력 잘림)

### [C3] CSV Formula Injection (confidence: 8/10)
src/lib/csv.ts:26-29 — 셀 값이 =, +, -, @로 시작할 때 Excel에서 수식으로 실행됨.
item_name이나 notes에 `=CMD('calc')` 같은 값이 들어오면 공격 가능.

**수정 방향**: 위험 문자로 시작하는 셀에 탭 문자 접두사 추가

---

## INFORMATIONAL (9건)

- [I1] execute_transfer.sql:120 — 도착지 lot_date가 now()로 생성됨. 백데이트된 이동 시 FIFO 순서가 어긋남.
- [I2] dashboard_summary — current_date가 UTC 기준이라 KST 월경계에서 집계 오차.
- [I3] 중복 item_id 라인 — UI에선 방지하지만 API/RPC 레벨 검증 없음.
- [I7] useWarehouseStockReport — enabled 조건 없이 마운트 시 전체 재고 조회.
- [I8] transfer_date Zod 검증이 z.string().min(1) — 날짜 형식/범위 미검증.
- [I9] URL.revokeObjectURL 타이밍 — click() 직후 해제 시 일부 브라우저에서 다운로드 실패 가능.

(I4~I6 리뷰 출력 잘림)
