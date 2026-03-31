# TODOS

## ~~P0 — 사전 작업~~ ✅ 완료

## ~~P0.5 — 슬라이스 1+2 구현~~ ✅ 완료

### 슬라이스 1 — 기초 마스터 ✅
- [x] 공통 인프라: Zod 스키마, 쿼리 키, 포맷 유틸, 공통 UI 컴포넌트
- [x] partners CRUD (거래처)
- [x] warehouses CRUD (창고)
- [x] items CRUD (품목)
- [x] bom CRUD (BOM 정의/재료) — 품목 상세 탭

### 슬라이스 2 — 입고 + 재고 ✅
- [x] purchase_orders CRUD (발주서) — 라인 인라인 입력
- [x] execute_goods_receipt RPC (초과 입고 방지 포함)
- [x] goods_receipts 입고 처리 — API Route + PO 연동 자동 채움
- [x] inventory 재고 현황 — 품목별/창고별 뷰 + 로트 드릴다운
- [x] po_payments 지급 관리 — PO 상세 내 인라인 등록

### 슬라이스 1+2 마무리 ✅
- [x] `supabase db push` — execute_goods_receipt RPC 마이그레이션 클라우드 적용
- [x] `supabase gen types typescript` — RPC 함수 타입 반영 (nullable 파라미터 포함)
- [x] API Route의 `(supabase.rpc as any)` 타입 단언 제거

---

## P1 — 슬라이스 3: 조립 ✅

- [x] consume_inventory RPC (FIFO 로트 소비)
- [x] execute_assembly RPC (BOM 기반 조립 실행)
- [x] Zod 스키마 + Query 키
- [x] TanStack Query 훅 + API Route
- [x] 조립 목록/생성/상세 UI

### 슬라이스 3 디자인 리뷰 반영 ✅
- [x] 예상 원가 미리보기 — useMaterialAvailability 훅 확장, FIFO 로트 단가 조회 + 재료별/총/단위 예상 원가 표시
- [x] 조립 상세 바로가기 버튼 — "재고 현황 확인" + "동일 품목 재조립" 링크 추가 (URL 파라미터로 품목 자동선택)
- [x] 코드 리뷰 반영 — execute_assembly RPC p_quantity/BOM 라인 가드 (이미 적용), queryKeys 팩토리 패턴 (완료), bg-red-50 → DESIGN.md 색상 교체 (완료)

### 코드 리뷰 P1+P2 수정 ✅
- [x] P1: 검색 필터 인젝션 방지 — escapeFilterValue 유틸 + 모든 훅 적용 (7개 파일)
- [x] P1: PO 상태 전환 race condition — atomic WHERE (expectedStatus 조건 추가)
- [x] P1: 사이드바 admin 쿼리 — useEffect → TanStack Query 캐시 (5분 staleTime)
- [x] P2: 온보딩 회사+프로필 생성 — RPC 원자화 (create_company_with_profile)
- [x] P2: inventory_summary 음수 방지 — GREATEST(0, ...) 적용

### 인증/권한 버그 수정 ✅
- [x] custom_access_token_hook NULL 안전 처리 + supabase_auth_admin RLS 정책 추가
- [x] admin_create_company RPC 역할 확인을 JWT → profiles 직접 조회로 변경
- [x] 로그아웃 시 프로필 캐시 미초기화 수정 — TopBar useEffect→useQuery 통일 + queryClient.clear()

### 슬라이스 3 마무리 ✅
- [x] `supabase db push` — consume_inventory + execute_assembly RPC 마이그레이션 적용
- [x] `supabase gen types typescript` — RPC 함수 타입 반영
- [x] API Route의 `(supabase.rpc as any)` 타입 단언 제거

### 디자인 리뷰 ✅
- [x] `/design-review` 완료 — 5개 FINDING 수정 (사이드바 접힘 기본, TopBar 터치 타겟, 퀵 스타트 가이드, TopBar 배경색, 사이드바 섹션 레이블)

### QA — 슬라이스 1~3 ✅
- [x] Select 드롭다운 영문 value 표시 수정 (ISSUE-001/002) — Base UI items prop 추가, 13개 파일
- [x] 미구현 페이지 404 → "준비 중" 안내 페이지 (ISSUE-003) — ComingSoon 컴포넌트 + 7개 placeholder
- [x] 전체 페이지 탐색 + 빈 상태 + 유효성 검증 + 사이드바 토글 + 모바일 반응형 확인
- 헬스 스코어: 69 → 85

---

## P1.5 — 슬라이스 4: 영업/출고 ✅

### 백엔드 인프라 ✅
- [x] DB 스키마 — sales_orders + sales_order_lines 테이블, RLS 정책
- [x] execute_shipment RPC — FIFO 로트 소비 + 매출원가 자동 계산 + 상태 갱신
- [x] API Route — POST /api/sales-orders/[id]/ship (출고 실행)
- [x] Zod 스키마 — salesOrderCreateSchema, salesOrderUpdateSchema, salesOrderLineSchema
- [x] TanStack Query 훅 — useSalesOrders, useSalesOrder, useCreateSalesOrder, useUpdateSalesOrderStatus, useExecuteShipment
- [x] Query 키 팩토리 — salesOrders (all/list/detail)

### UI 구현 ✅
- [x] 판매주문 목록 페이지 — 검색 + 상태 필터(draft/confirmed/shipped/cancelled) + 페이지네이션
- [x] 판매주문 생성 페이지 — 거래처(고객) 선택, 라인 인라인 입력(품목/창고/수량/단가), 합계 자동계산
- [x] 판매주문 상세 페이지 — 라인 목록, 상태 변경(확정/취소), 출고 실행 버튼, 매출원가/이익 표시

### 마무리 ✅
- [x] `supabase db push` — execute_shipment 마이그레이션 클라우드 적용
- [x] `supabase gen types typescript` — RPC 함수 타입 반영
- [x] Next.js 빌드 확인 통과
- [x] ComingSoon 제거 — sales-orders/page.tsx 실제 UI로 교체 (슬라이스 4 구현 시 완료됨)

### 디자인 리뷰 ✅
- [x] `/design-review` 완료

### QA — 슬라이스 4 ✅
- [x] 품목 등록 min_stock_qty valueAsNumber 누락 수정 (ISSUE-002) — 조용한 제출 실패
- [x] Supabase 에러 메시지 미표시 수정 (ISSUE-001) — extractErrorMessage 유틸, 11파일 19개 catch
- [x] Vitest + Testing Library 테스트 프레임워크 부트스트랩
- [x] 빈 테이블 스켈레톤 깜빡임 (ISSUE-003, Low) — keepPreviousData 적용 (10개 훅)
- 헬스 스코어: 80.8 → 89

---

## P2 — 슬라이스 5: 이동 + 보고서 + 대시보드

### 백엔드 인프라 ✅
- [x] execute_transfer RPC — 출발지 FIFO 소비 → 도착지 새 lot 생성 + inventory_summary UPSERT
- [x] report_inventory_ledger RPC — 기간별 수불부 (기초잔량, 입출고, 기말잔량)
- [x] report_warehouse_stock RPC — 창고별 재고 현황
- [x] report_sales RPC — 매출 보고서 (매출액, 원가, 이익률)
- [x] dashboard_reorder_alerts RPC — 재발주 필요 품목 (현재고 < min_stock_qty)
- [x] dashboard_summary RPC — 처리 대기 건수 + 이번 달 매입/매출 + 온보딩 상태
- [x] API Route — POST /api/warehouse-transfers (이동 실행)
- [x] Zod 스키마 — warehouseTransferCreateSchema + transferLineSchema
- [x] TanStack Query 훅 — 이동(목록/상세/실행), 보고서 3종, 대시보드(요약/재발주)
- [x] Query 키 팩토리 — warehouseTransfers, reports, dashboard
- [x] TypeScript 타입 체크 통과 (RPC 타입 단언 포함, db push 후 제거 예정)

### UI 구현 ✅
- [x] 창고 이동 목록/생성/상세 페이지
- [x] 보고서: 재고 수불부 (필터 + 테이블 + CSV 내보내기)
- [x] 보고서: 창고별 재고 (필터 + 테이블 + CSV 내보내기)
- [x] 보고서: 매출 보고서 (필터 + 테이블 + CSV 내보내기)
- [x] 대시보드 (재발주 알람 + 처리 대기 + 매입/매출 요약 + 온보딩 위젯)
- [x] CSV 내보내기 유틸리티 (src/lib/csv.ts) — UTF-8 BOM + 엑셀 호환

### 마무리 ✅
- [x] `supabase db push` — 3개 RPC 마이그레이션 클라우드 적용 (execute_transfer, reports, dashboard)
- [x] `supabase gen types typescript` — RPC 함수 타입 반영
- [x] `(supabase.rpc as any)` 타입 단언 제거 + nullable→undefined 수정
- [x] TypeScript 타입 체크 통과
- [x] ComingSoon 제거 — 창고이동/보고서 페이지 실제 UI로 교체
- [x] Next.js 빌드 통과

---

## P2.5 — 슬라이스 5 완료 후 ✅

### settings 페이지 구현 ✅
- [x] 회사 설정 — 기본 정보 수정(회사명/사업자번호/주소/연락처), 원가 방식 표시, 초대 코드 표시
- [x] 사용자 관리 — 같은 회사 사용자 목록, 검색, 역할 변경, 활성/비활성 토글, 승인 대기 표시
- [x] 사용자 초대 API — company_admin 전용 POST /api/settings/invite-user (역할 선택 가능)
- [x] 권한 분리 — company_admin은 편집 가능, normal은 읽기 전용
- [x] 기존 빌드 에러 수정 — warehouse-transfers/route.ts p_notes null→undefined

### 단위 테스트 작성 ✅
- [x] utils.test.ts — escapeFilterValue (9개 케이스)
- [x] csv.test.ts — sanitizeCsvCell, buildCsvString, downloadCsv, exportCsv (15개 케이스)
- [x] api-error.test.ts — ApiError, extractErrorMessage, mapSupabaseError, apiSuccess/apiError (16개 케이스)
- [x] validations.test.ts — Zod 스키마 10종 (partner, item, warehouse, PO, SO, GR, assembly, BOM, payment, transfer) (36개 케이스)
- [x] csv.ts 리팩토링 — sanitizeCsvCell, buildCsvString 순수 함수로 분리·export
- [x] query-keys.test.ts — queryKeys 팩토리 구조 검증, 도메인 간 키 격리 (14개 케이스)
- [x] api-auth.test.ts — getAuthenticatedUser (인증/프로필 실패), requireRole (7개 케이스)
- [x] api-handler.test.ts — withApiHandler ApiError/ZodError/예외 분기 (5개 케이스)
- 총 118개 테스트 통과

### 다크 모드 토글 UI ✅
- [x] ThemeProvider (next-themes) → providers.tsx 추가
- [x] TopBar 테마 토글 버튼 (Sun/Moon 아이콘, localStorage 자동 저장)

### QA — 슬라이스 5 ✅
- [x] ISSUE-001/002: 설정·사용자관리 캐시 키 충돌 (Critical) — `['profile','me']` select 필드 통일
- [x] ISSUE-003: next-themes hydration mismatch (Medium) — `suppressHydrationWarning`
- [x] ISSUE-004: Base UI nativeButton 경고 (Low) — render prop 시 자동 비활성
- [x] ISSUE-005: 모바일 보고서 테이블 잘림 (Low) — `overflow-x-auto`
- 헬스 스코어: 79 → 100

### 디자인 리뷰 — 슬라이스 5 ✅
- [x] FINDING-001 (High): 사이드바 메뉴 터치타겟 32→40px — `sidebar.tsx` h-8→h-10
- [x] FINDING-002 (Medium): H2 크기 16→20px — 대시보드/설정 5개소 통일
- [x] FINDING-004 (Medium): 날짜 포맷 마침표 → YYYY-MM-DD 수동 포맷
- [x] FINDING-005 (Medium): 수불부 거래유형 영문→한글 매핑 8종
- [ ] FINDING-003 (Low, deferred): 대시보드 하단 빈 공간 — 데이터 축적 시 자연 해소
- 디자인 점수: 6.5 → 8.3

### 롤백/정정 트랜잭션
- [x] RPC 설계 문서 완료 (`.planning/phase-06-rollback.md`)
  - cancel_shipment (출고 취소) — 로트 복원, SO→confirmed
  - cancel_goods_receipt (입고 취소) — 로트 제거, PO 상태 롤백
  - cancel_transfer (이동 취소) — 양방향 (출발지 복원 + 도착지 제거)
  - cancel_assembly (조립 취소) — 재료 복원 + 결과물 제거
  - restore_lot_consumptions 공통 유틸 함수
- [x] DB 마이그레이션 (cancelled_at, cancel_reason 컬럼) — 4개 테이블
- [x] restore_lot_consumptions 공통 유틸 함수 구현
- [x] RPC 구현 (cancel_shipment, cancel_goods_receipt, cancel_transfer, cancel_assembly)
- [x] API Route 4종 구현
- [x] DB push + 타입 재생성 + TypeScript/Next.js 빌드 통과
- [x] UI (취소 버튼 + CancelDialog + 취소 상태 표시) — 4개 상세 페이지
  - [x] CancelDialog 공통 컴포넌트 (사유 입력 + 경고 메시지)
  - [x] 취소 뮤테이션 훅 4종 (useCancelShipment/GoodsReceipt/Transfer/Assembly)
  - [x] 판매주문 상세 — 출고 취소 버튼 + 취소 정보 표시
  - [x] 조립 상세 — 조립 취소 버튼 + 취소 정보 표시
  - [x] 창고 이동 상세 — 이동 취소 버튼 + 취소 정보 표시
  - [x] 입고 상세 페이지 신규 생성 — 입고 취소 버튼 + 라인 목록 + 목록 클릭 링크
  - [x] goodsReceipts.detail 쿼리 키 + useGoodsReceipt 훅 추가
- [ ] 보고서 RPC 수정 (cancel 타입 집계)

---

## 배포 전 체크리스트

- [x] `supabase db push` — execute_goods_receipt 마이그레이션 클라우드 적용
- [x] `supabase gen types typescript` — DB 타입 재생성 (RPC 함수 타입 반영)
- [x] Supabase 대시보드 → Authentication → Providers → **Google OAuth 설정**
- [x] Supabase 대시보드 → Authentication → URL Configuration
- [x] **super_admin 계정 생성** (Supabase 대시보드)
- [x] **Vercel 배포** (GitHub 연결 + 환경변수 설정)
- [x] 배포 후 검증 (로그인, OAuth, 관리자 접근, 회원가입 플로우)

---

## P3 — 참고 사항

### 일정 가이드라인
각 슬라이스의 Week 단위 일정은 가이드라인이지 기한이 아님.
엑셀 업로드는 고객 엑셀 샘플 확보 후 구현.
