# 체크포인트

## 현재 상태
- **단계**: 프로젝트 초기화 완료, 슬라이스 1 준비
- **마지막 업데이트**: 2026-03-30

## 완료된 작업
- [x] .planning 디렉토리 구조 생성
- [x] 프로젝트 목적 및 요구사항 정의
- [x] 기술 스택 검토 및 확정 (phase-01-arch.md)
- [x] DB 설계 완료 (phase-02-db.md) - 22개 테이블, FIFO 로트 추적 구조
- [x] API 설계 완료 (phase-03-api.md) - Hybrid 패턴, API Route 10개 + Supabase 직접 55개
- [x] 디자인 문서 승인 (office-hours) - 수직 슬라이스 5+1단계
- [x] `/plan-eng-review` 완료 — 8개 이슈 해결, 외부 의견 8건 중 6건 수용
- [x] UI/UX 설계 완료 (phase-04-ui.md) — 네비게이션, 화면별 명세, 상태 커버리지, 보고서 3종
- [x] `/plan-design-review` 완료 — 1/10 → 7/10, 7개 디자인 결정 확정
- [x] Supabase 클라우드 프로젝트 생성 (ref: oftpwwxvwlszspnfvckh, 리전: Tokyo)
- [x] Supabase CLI 설치 + 로컬 프로젝트 link 완료
- [x] Next.js 15 프로젝트 초기화 (TypeScript + Tailwind + App Router + src/ 구조)
- [x] `/design-consultation` 완료 — 디자인 시스템 확정 → .planning/DESIGN.md 생성

## 진행 중인 작업
- 없음

## 다음 할 일
1. shadcn/ui 설치 + Supabase 클라이언트 패키지 설치
2. 슬라이스 1 구현 시작: 기초 마스터 (companies, profiles, partners, warehouses, items, bom)

## 주요 결정 사항
- 상태관리: Zustand(클라이언트) + TanStack Query(서버)
- 원가 계산: 회사 단위 설정 (FIFO/LIFO/WEIGHTED_AVG), FIFO 먼저 구현
- 핵심 비즈니스 로직: PostgreSQL function + supabase.rpc() 패턴
- 멀티테넌시: company_id + RLS 격리
- API 방식: Hybrid (단순 CRUD → Supabase 직접, 복잡한 로직 → API Route)
- 구현 전략: 수직 슬라이스 (기능 단위로 DB+API+UI 함께)
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

## 블로커 / 미결 사항
- ~~Supabase 프로젝트 생성 필요~~ → 완료 (클라우드, Tokyo 리전)
- 첫 고객 엑셀 파일 샘플 확보 필요 (엑셀 업로드 기능 설계용)
- OAuth provider 결정 (Google? Kakao? 둘 다?)
