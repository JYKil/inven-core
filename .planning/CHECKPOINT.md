# 체크포인트

## 현재 상태
- **단계**: 슬라이스 5 완료 (QA 헬스 79→100, 디자인 6.5→8.3) / 롤백 RPC 설계 완료
- **마지막 업데이트**: 2026-03-31

## 완료된 작업
- [x] .planning 디렉토리 구조 생성
- [x] 프로젝트 목적 및 요구사항 정의
- [x] 기술 스택 검토 및 확정 (phase-01-arch.md)
- [x] DB 설계 완료 (phase-02-db.md) - 22개 테이블, FIFO 로트 추적 구조
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
17. ~~단위 테스트~~ → 완료 (총 118개 통과)
18. ~~롤백/정정 트랜잭션 설계~~ → 완료 (phase-06-rollback.md)

19. ~~슬라이스 5 디자인 리뷰~~ → 완료 (6.5→8.3, 4 FINDING 수정, 1 deferred)

### 남은 작업
1. **롤백/정정 RPC 구현** — 설계 완료, 코드 작성 대기
   - DB 마이그레이션 (cancelled_at, cancel_reason 컬럼)
   - RPC 구현 (cancel_shipment → cancel_goods_receipt → cancel_transfer → cancel_assembly)
   - API Route 4종 + UI (취소 버튼 + AlertDialog)
   - 보고서 RPC 수정 (cancel 타입 집계)
2. **Vercel 재배포** — QA + 디자인 리뷰 수정사항 반영
3. **엑셀 업로드** — 고객 샘플 확보 후

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

## 블로커 / 미결 사항
- ~~Supabase 프로젝트 생성 필요~~ → 완료 (클라우드, Tokyo 리전)
- 첫 고객 엑셀 파일 샘플 확보 필요 (엑셀 업로드 기능 설계용)
- ~~OAuth provider 결정~~ → Google OAuth 확정 (2026-03-30)
- ~~execute_goods_receipt 마이그레이션 클라우드 적용 필요~~ → 완료 (2026-03-30)
- ~~DB 타입 재생성 필요~~ → 완료 (2026-03-30, nullable 파라미터 반영)
