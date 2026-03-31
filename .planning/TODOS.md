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

### 슬라이스 3 마무리 (DB push 필요)
- [ ] `supabase db push` — consume_inventory + execute_assembly RPC 마이그레이션 적용
- [ ] `supabase gen types typescript` — RPC 함수 타입 반영
- [ ] API Route의 `(supabase.rpc as any)` 타입 단언 제거

---

## P1.5 — 슬라이스 4: 영업/출고

### 판매 주문 CRUD
- sales_orders 생성/목록/상세
- 출고 처리 → consume_inventory
- 매출 원가 자동 계산 (FIFO)

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

- [ ] `supabase db push` — execute_goods_receipt 마이그레이션 클라우드 적용
- [ ] `supabase gen types typescript` — DB 타입 재생성 (RPC 함수 타입 반영)
- [ ] Supabase 대시보드 → Authentication → Providers → **Google OAuth 설정**
  - Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
  - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
  - Client ID / Client Secret을 Supabase에 입력
- [ ] Supabase 대시보드 → Authentication → URL Configuration
  - Site URL: 배포된 Vercel URL (예: `https://inven-core.vercel.app`)
  - Redirect URLs에 `https://inven-core.vercel.app/auth/callback` 추가
- [ ] **super_admin 계정 생성** (Supabase 대시보드)
  1. Authentication → Users → Add user (Auto Confirm 체크)
  2. SQL Editor에서 profiles INSERT (`role = 'super_admin'`, `company_id = NULL`)
- [ ] **Vercel 배포**
  - GitHub 연결 → 프로젝트 import
  - 환경변수 설정: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - 빌드 확인 후 배포
- [ ] 배포 후 검증
  - `/login` 접속 → 이메일 로그인 + Google OAuth 테스트
  - super_admin으로 로그인 → `/admin/companies`, `/admin/users` 접근 확인
  - 회원가입 → 온보딩(회사 생성) → 대시보드 진입 확인

---

## P3 — 참고 사항

### 일정 가이드라인
각 슬라이스의 Week 단위 일정은 가이드라인이지 기한이 아님.
엑셀 업로드는 고객 엑셀 샘플 확보 후 구현.
