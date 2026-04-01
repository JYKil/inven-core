# 체크포인트

## 현재 상태
- **단계**: v0.2.0.0 프로덕션 배포 완료 (기준정보 + 거래처 분리)
- **마지막 업데이트**: 2026-04-01
- **디자인 점수**: A-, AI 슬롭: A
- **프로덕션 URL**: https://inven-core.vercel.app

## 완료된 작업
- [x] .planning 디렉토리 구조 생성
- [x] 프로젝트 목적 및 요구사항 정의
- [x] 기술 스택 검토 및 확정 (phase-01-arch.md)
- [x] DB 설계 완료 (phase-02-db.md) - 24개 테이블, FIFO 로트 추적 구조
- [x] API 설계 완료 (phase-03-api.md) - Hybrid 패턴, API Route 10개 + Supabase 직접 55개
- [x] 디자인 문서 승인 (office-hours) - 수직 슬라이스 5+1단계
- [x] `/plan-eng-review` 완료 — 8개 이슈 해결, 외부 의견 8건 중 6건 수용
- [x] UI/UX 설계 완료 (phase-04-ui.md) — 네비게이션, 화면별 명세, 상태 커버리지, 보고서 3종
- [x] `/plan-design-review` 1차 완료 — 1/10 → 7/10, 7개 디자인 결정 확정
- [x] `/plan-design-review` 2차 완료 — 7/10 → 9/10, 7개 차원 리뷰 (사이드바 통일, 상태 커버리지, 토스트 규칙, 모바일 네비, 다크 모드 CSS, 온보딩 스타일, 완료 복귀 흐름)
- [x] Supabase 클라우드 프로젝트 생성 (ref: oftpwwxvwlszspnfvckh, 리전: Tokyo)
- [x] Supabase CLI 설치 + 로컬 프로젝트 link 완료
- [x] Next.js 15 프로젝트 초기화 (TypeScript + Tailwind + App Router + src/ 구조)
- [x] `/design-consultation` 완료 — 디자인 시스템 확정 → .planning/DESIGN.md 생성
- [x] shadcn/ui + Supabase + Zustand + TanStack Query + RHF + Zod 설치 완료
- [x] 사전 작업 (6개 항목 전체 완료)
- [x] 인증 플로우 구현 (로그인/회원가입/온보딩/미들웨어)
  - [x] 인증 전용 레이아웃 — (auth)/layout.tsx
  - [x] 로그인 — 이메일/비밀번호 + Google OAuth
  - [x] 회원가입 — 이메일 확인 방식 + Google OAuth
  - [x] 인증 콜백 — auth/callback (프로필 유무 분기)
  - [x] 온보딩 — 회사 생성(company_admin) 또는 초대 코드 참여(normal)
  - [x] 미들웨어 — 미인증→/login, 프로필 없음→/onboarding 리다이렉트
  - [x] super_admin 전용 UI — 회사 관리(/admin/companies) + 전체 사용자 관리(/admin/users)
  - [x] admin 권한 가드 — server layout에서 role 확인, 비권한자 리다이렉트
  - [x] super_admin 사이드바 — 관리 메뉴만 표시 (일반 업무 메뉴 제거)
  - [x] 회사 관리자 초대 — API Route + 회사별 사용자 목록/관리자 추가 다이얼로그
- [x] **인증/권한 버그 수정 (2026-03-31)**
  - [x] custom_access_token_hook NULL 안전 처리 + supabase_auth_admin RLS 정책 추가
  - [x] admin_create_company RPC 역할 확인을 JWT → profiles 직접 조회로 변경
  - [x] 로그아웃 시 TanStack Query 캐시 미초기화 → 사이드바 메뉴 오표시 수정 (TopBar useEffect→useQuery 통일)
- [x] **슬라이스 1: 기초 마스터 CRUD**
  - [x] Zod 스키마 7개 (partner, warehouse, item, bom, purchase-order, goods-receipt, po-payment)
  - [x] TanStack Query 키 팩토리 + 도메인별 훅 8개
  - [x] 공통 UI 컴포넌트 (PageHeader, StatusBadge, DataTablePagination, EmptyState, SearchInput)
  - [x] 숫자 포맷 유틸 (formatQty, formatAmount, formatUnitPrice, formatPercent, formatDate)
  - [x] 거래처(partners) — 목록/등록/상세수정 (검색+필터+페이지네이션)
  - [x] 창고(warehouses) — 목록/등록/상세수정
  - [x] 품목(items) — 목록/등록/상세수정 (유형 배지, 재고 경고, 카테고리 필터)
  - [x] BOM — 품목 상세 탭에서 생성/조회 (재료 검색+인라인 편집)
- [x] **슬라이스 2: 입고 + 재고**
  - [x] 발주서(PO) — 목록/생성/상세 (라인 인라인 입력, 입고이력탭, 지급이력탭)
  - [x] execute_goods_receipt RPC 함수 (초과 입고 방지, 로트 생성, inventory_summary UPSERT, PO 상태 갱신)
  - [x] API Route: POST /api/goods-receipts (RPC 호출 래퍼)
  - [x] 입고(goods-receipts) — 목록/생성 (PO에서 진입 시 자동 채움)
  - [x] 재고 현황 — 품목별/창고별 뷰 토글, 로트 드릴다운
  - [x] 지급관리(po-payments) — 목록 + PO 상세 내 인라인 등록

- [x] **슬라이스 4: 영업/출고(Sales)**
  - [x] DB 스키마 (sales_orders, sales_order_lines 테이블 + RLS)
  - [x] execute_shipment RPC (FIFO 로트 소비, 매출원가 자동계산, 상태 갱신)
  - [x] API Route: POST /api/sales-orders/[id]/ship
  - [x] Zod 스키마 (salesOrderCreateSchema, salesOrderUpdateSchema)
  - [x] TanStack Query 훅 (목록/상세/생성/상태변경/출고실행)
  - [x] Query 키 팩토리 (salesOrders)
  - [x] 판매주문 목록 UI (검색+상태필터+페이지네이션)
  - [x] 판매주문 생성 UI (라인별 창고 선택, 품목 검색, 합계 자동계산)
  - [x] 판매주문 상세 UI (확정/출고/취소 액션, 매출원가/이익 표시)
  - [x] DB push + 타입 재생성 + 빌드 확인

- [x] **슬라이스 3: 조립(Assembly)**
  - [x] consume_inventory RPC (FIFO 로트 소비, 데드락 방지)
  - [x] execute_assembly RPC (BOM 기반 조립 실행, 재료 소비 + 결과물 로트 생성)
  - [x] Zod 스키마 (assemblyOrderCreateSchema) + Query 키
  - [x] TanStack Query 훅 (목록/상세/재료가용성/조립실행)
  - [x] API Route: POST /api/assembly-orders
  - [x] 조립 목록 (검색+상태필터+페이지네이션)
  - [x] 조립 생성 (BOM 선택, 재료 가용성 사전확인 테이블, 조립 실행)
  - [x] 조립 상세 (원가 정보, 재료 소비 내역)

## 다음 할 일
1. ~~슬라이스 3 디자인 리뷰 반영~~ → 완료
2. ~~인증/권한 버그 수정~~ → 완료
3. ~~DB push + 타입 재생성~~ → 완료
4. ~~디자인 리뷰~~ → 완료
5. ~~QA — 슬라이스 1~3~~ → 완료 (헬스 69→85)
6. ~~슬라이스 4: 영업/출고~~ → 완료
7. ~~슬라이스 4 디자인 리뷰~~ → 완료
8. ~~슬라이스 4 QA~~ → 완료 (헬스 80.8→89, 3 이슈 발견, 2 수정)
9. ~~슬라이스 5 백엔드~~ → 완료 (RPC 6개 + API Route + Hooks + Schemas + db push + 타입 재생성)
10. ~~슬라이스 5 UI~~ → 완료
    - [x] 창고 이동 목록/생성/상세 페이지
    - [x] 보고서: 재고 수불부 (필터 + 테이블 + CSV)
    - [x] 보고서: 창고별 재고 (필터 + 테이블 + CSV)
    - [x] 보고서: 매출 보고서 (필터 + 테이블 + CSV)
    - [x] 대시보드 (재발주 알람 + 대기 건수 + 매입/매출 요약 + 온보딩 위젯)
    - [x] ComingSoon 제거 — 창고이동/보고서 페이지 실제 UI로 교체
    - [x] CSV 내보내기 유틸리티 (src/lib/csv.ts)
    - [x] TypeScript + Next.js 빌드 통과
11. ~~슬라이스 5 코드 리뷰~~ → 완료 (C1 RPC auth, C3 CSV injection, I1~I9 수정, db push)
12. ~~ISSUE-003 스켈레톤 깜빡임 수정~~ → 완료 (keepPreviousData 10개 훅 적용)
13. ~~다크 모드 토글 UI~~ → 완료 (ThemeProvider + TopBar 토글 버튼)
14. ~~CSV 보고서 유틸~~ → 완료 (exportCsv 제네릭 + 보고서 3종 전용 함수)
15. ~~슬라이스 5 QA~~ → 완료 (헬스 79→100, 5 이슈 발견/5 수정)
16. ~~settings 페이지~~ → 완료 (회사 설정 + 사용자 관리 + 초대 API)
17. ~~단위 테스트~~ → 완료 (총 164개 통과)
18. ~~롤백/정정 트랜잭션 설계~~ → 완료 (phase-06-rollback.md)

19. ~~슬라이스 5 디자인 리뷰~~ → 완료 (6.5→8.3, 4 FINDING 수정, 1 deferred)

19. ~~롤백/정정 RPC 구현~~ → 완료
    - [x] DB 마이그레이션 (cancelled_at, cancel_reason — 4개 테이블)
    - [x] restore_lot_consumptions 공통 유틸 함수
    - [x] cancel_shipment / cancel_goods_receipt / cancel_transfer / cancel_assembly RPC 4종
    - [x] API Route 4종
    - [x] CancelDialog 공통 컴포넌트 + 뮤테이션 훅 4종
    - [x] 상세 페이지 4종에 취소 버튼 + 취소 상태 표시
    - [x] 입고 상세 페이지 신규 생성 (goods-receipts/[id])
    - [x] DB push + 타입 재생성 + TypeScript/Next.js 빌드 통과

    - [x] 보고서 RPC 수정 (cancel 타입 상계 집계 + UI 라벨 6종 추가)

20. ~~E2E 테스트 보강~~ → 완료 (기존 4파일 → 11파일, 31개 시나리오)
    - [x] 판매 플로우 (SO 생성 → 확정 → 출고 → 목록 확인) — 4건
    - [x] 조립 플로우 (BOM 선택 → 재료 가용성 → 실행 → 상세) — 3건
    - [x] 창고 이동 플로우 (생성 → 상세 → 목록) — 3건
    - [x] 취소 플로우 (출고 취소 CancelDialog → 재출고 가능 확인 + 입고 상세) — 4건
    - [x] 보고서 스모크 (수불부/창고재고/매출 필터+렌더링 + cancel 라벨 검증) — 4건
    - [x] 대시보드 (위젯 렌더링 + 링크 동작) — 3건
    - [x] 설정 (회사 설정/사용자 관리 + 탭 네비) — 3건

21. ~~성능 최적화~~ → 완료
    - [x] next.config.ts 프로덕션 설정 (poweredByHeader, compress, optimizeCss)
    - [x] middleware.ts → proxy.ts 마이그레이션 (Next.js 16 권장)
    - [x] TanStack Query 캐시 전략 (gcTime 10분, retry 1회, refetchOnReconnect)
    - [x] loading.tsx 7개 라우트 추가 (대시보드 + 주요 목록 6개)
    - [x] 16개 페이지 서버/클라이언트 분리 (page.tsx → 서버 래퍼 + _content.tsx 클라이언트)
    - [x] 16개 페이지별 메타데이터 추가 + 루트 title template 적용
    - [x] Pretendard 폰트 preload + dns-prefetch/preconnect (렌더 블로킹 제거)
    - [x] ListLoading 공통 스켈레톤 컴포넌트

22. ~~롤백 기능 QA~~ → 완료
    - [x] 출고 취소 (cancel_shipment): PASS — shipped→confirmed, 토스트/취소일/사유 정상
    - [x] 입고 취소 (cancel_goods_receipt): PASS — confirmed→cancelled, 취소일/사유 정상
    - [x] 재고 수불부 cancel 반영: PASS — sale_out_cancel, purchase_in_cancel 정상 표시/상계
    - [x] **버그 수정**: transaction_type CHECK 제약조건 누락 (migration 000017)
    - [x] **버그 수정**: proxy.ts export 이름 (middleware→proxy, Next.js 16)
    - [x] **버그 수정**: critters 모듈 누락 (npm install)
    - [ ] 창고이동 취소 / 조립 취소: 테스트 데이터 부족으로 미검증 (RPC는 동일 패턴)

23. ~~Quick Win 3건~~ → 완료 (2026-03-31)
    - [x] CTA 버튼 대비 AA 충족 (primary #D4642A→#BF5520, hover→#A84A1B)
    - [x] 폼 label htmlFor/id 연결 (6개 폼: items/PO/SO/GR/assembly/transfer)
    - [x] 테이블 sticky 컬럼 (items, warehouses, inventory, 보고서 3종)

24. **디자인 리뷰 deferred 마무리** → 완료 (2026-03-31)
    - [x] 사이드바 hover 플로팅 패널 (DESIGN.MD L77 스펙)
      - sidebar.tsx: hovered 상태 + onMouseEnter/onMouseLeave
      - 갭 항상 56px, 호버 시 220px 플로팅 확장 + shadow-xl
      - 데스크톱 SidebarTrigger 숨김 (md:hidden)
      - 툴팁 호버 확장 시 자동 숨김
    - [x] 스페이싱 디자인 토큰 정리 (49개 파일)
      - rounded-[8px] → rounded-lg (29파일)
      - rounded-[6px] → rounded-md (14파일)
      - rounded-[3px] → rounded-sm (6파일)

25. **INFORMATIONAL 항목 마무리** → 완료 (2026-03-31)
    - [x] I7: useWarehouseStockReport enabled 옵션 추가
    - [x] loading.tsx 누락 6개 라우트 추가 (warehouses, assembly-orders, goods-receipts, po-payments, settings, warehouse-transfers)
    - [x] retry 정책 명시 — mutation retry: 0 명시 (side effect 중복 방지)
    - [x] 테스트 커버리지 보강 — 118개 → 150개 (+32개: formatUnitPrice, formatPercent, formatDate, formatQty 엣지 케이스)

26. **전체 QA (2차)** → 완료 (2026-03-31)
    - [x] 19개 페이지 탐색, 3건 이슈 발견
    - [x] ISSUE-002: 모바일 대시보드 재발주 테이블 헤더 줄바꿈 → overflow-x-auto + whitespace-nowrap
    - [x] ISSUE-003: 단가 포맷 후행 0 제거 (₩360,000.0000 → ₩360,000)
    - [x] ISSUE-001: Base UI Select hydration mismatch → Portal 마운트 가드 적용
    - 헬스 스코어: 94.3, 테스트 151개 통과

27. **대시보드 테이블 레이아웃 + Select hydration 수정** → 완료 (2026-03-31)
    - [x] 대시보드 KPI 카드 4개 → 업무 현황 테이블 전환 (DESIGN.MD grid-disciplined 스펙)
    - [x] 이익 행 추가 (매출 - 매출원가)
    - [x] Base UI Select hydration mismatch — Portal 마운트 후 렌더링으로 해결

28. **기준정보(Reference Codes) /plan-eng-review 완료** (2026-04-01)
    - 디자인 문서 기반 아키텍처 리뷰 6건 이슈 해결
    - DDL 수정 5건: 트레일링 콤마, NOT NULL, RLS 헬퍼, super_admin bypass, moddatetime 스키마
    - sort_order: 앱 레벨 MAX+1 유지
    - 타입 목록/목록 조회: is_active=true 필터
    - code_type: Zod trim() 적용
    - 테스트 범위: Zod ~8건 + E2E ~4건

29. **기준정보(Reference Codes) 구현** → 완료 (2026-04-01)
    - [x] DB 마이그레이션 — reference_codes 테이블 (RLS, moddatetime, partial UNIQUE)
    - [x] supabase db push + 타입 재생성
    - [x] Zod 스키마 (create/update, trim 적용)
    - [x] Query 키 + TanStack Query 훅 5개 (목록/타입목록/생성/수정/삭제)
    - [x] ReferenceCodeDialog 컴포넌트 (Combobox 타입 선택, code_data1~9)
    - [x] 페이지 UI (목록/필터/검색/페이지네이션, sticky 컬럼, 수정/삭제 액션)
    - [x] 사이드바 메뉴 추가 (기초 마스터 > 기준정보)
    - [x] Zod 단위 테스트 11건 (총 161개 통과)
    - [x] TypeScript + Next.js 빌드 통과

30. **기준정보 마무리** → 완료 (2026-04-01)
    - [x] supabase db push — RPC 마이그레이션(get_reference_code_types, create_reference_code) 적용
    - [x] supabase gen types typescript — src/types/database.ts 갱신
    - [x] `as any` 타입 단언 제거 (use-reference-codes.ts 2곳)
    - [x] null→undefined 수정 (optional RPC 파라미터)
    - [x] TypeScript + Next.js 빌드 통과
    - [x] E2E 스모크 테스트 4건 (reference-codes.spec.ts)
    - [x] 단위 테스트 161개 통과

31. **거래처 분리 (partners → vendors + customers)** → 완료 (2026-04-01)
    - [x] DB 마이그레이션 — vendors/customers CREATE TABLE, RLS, moddatetime, 초기 데이터
    - [x] FK 마이그레이션 — purchase_orders(partner_id→vendor_id), sales_orders(partner_id→customer_id)
    - [x] RPC 수정 — report_sales(partner→customer), dashboard_summary(partner_count→vendor_count+customer_count)
    - [x] partners 테이블 DROP CASCADE
    - [x] Zod 스키마 — vendorCreateSchema(은행/계좌 필드), customerCreateSchema(입금통화)
    - [x] TanStack Query 훅 — use-vendors.ts, use-customers.ts (각 CRUD 5개)
    - [x] 페이지 UI — /vendors(목록/등록/상세), /customers(목록/등록/상세)
    - [x] 기존 참조 수정 — PO/SO/지급/보고서/대시보드 등 ~20개 파일
    - [x] partners 관련 파일 삭제 — 페이지/훅/스키마
    - [x] 테스트 수정 — 단위 테스트 166개 통과
    - [x] TypeScript + Next.js 빌드 통과

32. **기준정보 Eng Review 반영** → 완료 (2026-04-01)
    - [x] create_reference_code RPC에 auth.uid() IS NULL 검증 추가
    - [x] cmdk CommandInput lowercase 버그 수정 (onInput ref로 원본값 추적)
    - [x] E2E CRUD 테스트 3건 추가 (생성/수정/삭제 플로우)
    - [x] TODO 2건 추가 (중복 에러 한글화, is_active DB 보호)

33. **디자인 리뷰 3차 (기준정보 + 거래처 분리)** → 완료 (2026-04-01)
    - [x] FINDING-001,002: 기준정보 액션 버튼 aria-label + 터치타겟 확대
    - [x] FINDING-003: SidebarHeader hydration mismatch 수정
    - [x] FINDING-004: 업체/고객 사이드바 아이콘 구분 (Users→UserCheck)
    - [x] FINDING-005: SidebarProvider SSR/CSR 쿠키 동기화
    - [x] FINDING-006: SO 목록 헤더 "거래처"→"고객" 수정
    - 디자인 점수: B+ → A-, AI 슬롭: A

34. **디자인 리뷰 3차 Deferred 수정** → 완료 (2026-04-02)
    - [x] SO 거래처 "-": RLS 수정(20260402000002)으로 이미 해결 확인
    - [x] 클릭 가능 테이블 행 aria-label 추가 (10개 목록 페이지)
    - [x] goods-receipts: tabIndex + onKeyDown + router.push 전환

35. **타이포그래피 토큰화** → 완료 (2026-04-02)
    - [x] globals.css @theme에 커스텀 fontSize 4종 추가 (h1/h3/cell/2xs)
    - [x] text-[Npx] 170개소 → Tailwind 토큰 일괄 치환 (31개 파일)
    - [x] text-[32px] 장식 1건만 유지
    - [x] database.ts CLI 버전 메시지 오염 수정
    - [x] TypeScript + Next.js 빌드 통과

### 남은 작업
1. ~~**supabase db push**~~ → 완료 (v0.2.0.0 배포)
2. ~~**supabase gen types typescript**~~ → 완료
3. ~~**Vercel 재배포**~~ → 완료 (2026-04-01, PR #1 머지 후 자동 배포)
4. **엑셀 업로드** — 고객 샘플 확보 후
5. **SO 거래처 데이터 "-"** — 기존 SO의 customer_id NULL (마이그레이션 데이터 이슈)

## 주요 결정 사항
- 상태관리: Zustand(클라이언트) + TanStack Query(서버)
- 원가 계산: 회사 단위 설정 (FIFO/LIFO/WEIGHTED_AVG), FIFO 먼저 구현
- 핵심 비즈니스 로직: PostgreSQL function + supabase.rpc() 패턴
- 멀티테넌시: company_id + RLS 격리
- API 방식: Hybrid (단순 CRUD → Supabase 직접, 복잡한 로직 → API Route)
- 구현 전략: 수직 슬라이스 (기능 단위로 DB+API+UI 함께), 슬라이스 1+2 병렬 진행
- OAuth: Google OAuth 사용
- 1단계 BOM 먼저, 2단계 BOM은 슬라이스 5에서
- LIFO/가중평균은 슬라이스 6(선택)으로 연기
- RLS: Custom Claims Hook (JWT에 company_id, profiles 서브쿼리 제거)
- RPC: SECURITY DEFINER + company_id 직접 필터링
- updated_at: moddatetime 트리거, 엑셀: ExcelJS (MIT)
- consume_inventory: IF/ELSE 분리, item_id 순서 데드락 방지
- 공통 패턴: CRUD 훅 팩토리 + withApiHandler 래퍼
- 테스트: Vitest + Supabase Local, RLS 격리 테스트 포함
- 개발 환경: Supabase 클라우드 우선 (고객 확인 가능), 배포는 Vercel 예정
- JWT: 회사 생성 후 refreshSession() 강제
- BOM: 순환참조 검증 (재귀 CTE), po_payments: 슬라이스 2 배치
- UI: PC 우선 + 핵심 모바일(입고/재고조회/대시보드만)
- UI: 인라인 테이블 편집 패턴 (PO/SO/조립/이동 공통)
- UI: 조립 실행 전 재료 가용성 사전확인 필수
- UI: PO 상세에 입고이력/지급이력 탭 통합
- UI: 품목 상세에서 BOM 별도 탭 관리
- UI: 단위별 숫자 정밀도 제한 (EA=정수, KG=소수4자리)
- UI: 보고서 3종 (수불부, 창고별 재고, 매출)
- base-ui Select: onValueChange에서 null 가능 — null guard 필수
- base-ui Button: asChild 미지원 → render prop 사용
- TopBar/사이드바: 프로필 데이터를 TanStack Query `['profile','me']` 캐시 공유, 로그아웃 시 queryClient.clear() 필수
- **캐시 키 공유 규칙**: 같은 queryKey를 쓰는 모든 쿼리는 반드시 동일한 select 필드와 반환 구조를 사용할 것 (QA ISSUE-001/002 교훈)
- base-ui Button: render prop 전달 시 자동으로 nativeButton=false (button.tsx 래퍼에서 처리)
- next-themes: `<html>` 태그에 suppressHydrationWarning 필수 (SSR/클라이언트 class 불일치 방지)
- 보고서 테이블: overflow-x-auto 사용 (overflow-hidden 금지, 모바일 가로 스크롤 보장)
- 기준정보: 범용 코드 테이블(code_type 구분), 다이얼로그 CRUD, sort_order 앱 레벨 MAX+1, 타입 자유 입력(Combobox)
- 거래처 분리: partners 단일 테이블 → vendors(은행/계좌/지급통화) + customers(입금통화) 분리, FK 전환 포함
- 사이드바: push 방식 (defaultOpen=true), 쿠키 기반 SSR 상태 동기화 필수 (hydration mismatch 방지)

## 블로커 / 미결 사항
- ~~Supabase 프로젝트 생성 필요~~ → 완료 (클라우드, Tokyo 리전)
- 첫 고객 엑셀 파일 샘플 확보 필요 (엑셀 업로드 기능 설계용)
- ~~OAuth provider 결정~~ → Google OAuth 확정 (2026-03-30)
- ~~execute_goods_receipt 마이그레이션 클라우드 적용 필요~~ → 완료 (2026-03-30)
- ~~DB 타입 재생성 필요~~ → 완료 (2026-03-30, nullable 파라미터 반영)
