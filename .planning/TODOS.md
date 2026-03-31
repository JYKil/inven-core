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
- [ ] ComingSoon 제거 — sales-orders/page.tsx 실제 UI로 교체

### 디자인 리뷰 ✅
- [x] `/design-review` 완료

---

## P2 — 슬라이스 5: 이동 + 보고서 + 대시보드

### 창고 이동
- warehouse_transfers CRUD
- 출발지 FIFO 소비 → 도착지 새 lot 생성

### 보고서 3종
- 재고 수불부 (기간별)
- 창고별 재고
- 매출 보고서

### 대시보드
- 재발주 알람 (min_stock_qty 이하)
- 온보딩 위젯 (기초 데이터 0건일 때)
- 이번 달 매입/매출 요약

---

## P2.5 — 슬라이스 5 완료 후

### 다크 모드 토글 UI
CSS 변수는 라이트+다크 양쪽 설정 완료 상태. 토글 UI(설정 화면 또는 TopBar)를 추가하여 사용자가 전환 가능하게 구현.
DESIGN.md에 다크 모드 컬러 토큰 정의 완료.

### 롤백/정정 트랜잭션
입고 취소, 조립 취소, 출고 정정 등 역방향 트랜잭션 RPC 함수 설계 및 구현.
FIFO 역전 코스팅(원가 복원) 로직이 복잡하므로 정방향 FIFO가 완성된 후 설계.

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
