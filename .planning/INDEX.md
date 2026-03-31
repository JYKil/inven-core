# 프로젝트 계획 개요

## 프로젝트명
inven-core (재고수불시스템)

## 목적
멀티테넌시 SaaS 재고 관리 시스템. 업체/창고/품목 관리, BOM 조립, 구매/입고/출고, FIFO/LIFO/가중평균 원가 계산을 지원한다.

## 기술 스택
- Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- Zustand + TanStack Query + React Hook Form + Zod

## 계획 문서 구성

| 문서 | 설명 | 상태 |
|------|------|------|
| [CHECKPOINT.md](./CHECKPOINT.md) | 현재 진행 상황 + 다음 할 일 | 최신 |
| [TODOS.md](./TODOS.md) | 상세 할 일 목록 | 최신 |
| [DESIGN.md](./DESIGN.md) | 디자인 시스템 (타이포그래피, 컬러, 레이아웃) | ✅ 완료 |
| [phase-01-arch.md](./phase-01-arch.md) | 아키텍처 설계 | ✅ 완료 |
| [phase-02-db.md](./phase-02-db.md) | DB 설계 (22개 테이블) | ✅ 완료 |
| [phase-03-api.md](./phase-03-api.md) | API 설계 (Hybrid 패턴, 65개 엔드포인트) | ✅ 완료 |
| [phase-04-ui.md](./phase-04-ui.md) | UI/UX 설계 (네비게이션, 화면별 명세, 상태 커버리지) | ✅ 완료 |
| [phase-06-rollback.md](./phase-06-rollback.md) | 롤백/정정 트랜잭션 RPC 설계 | ✅ 완료 |
| [REVIEW-SLICE5.md](./REVIEW-SLICE5.md) | 슬라이스 5 코드 리뷰 | ✅ 완료 |

## 단계별 로드맵

```
Phase 1: 아키텍처 설계 ✅
Phase 2: DB 설계 ✅
Phase 3: API 설계 ✅
Phase 4: UI/UX 설계 ✅
Phase 5: 구현 — 슬라이스 1~5 ✅
  - 슬라이스 1: 기초 마스터 CRUD (거래처/창고/품목/BOM)
  - 슬라이스 2: 입고 + 재고 (발주/입고/지급/재고현황)
  - 슬라이스 3: 조립 (BOM 기반 조립 실행)
  - 슬라이스 4: 영업/출고 (판매주문/FIFO 출고)
  - 슬라이스 5: 이동 + 보고서 + 대시보드 + 설정
Phase 6: 롤백/정정 트랜잭션 ✅ (취소 RPC 4종)
Phase 7: 성능 최적화 ✅ (서버/클라이언트 분리, loading.tsx, 메타데이터)
```
