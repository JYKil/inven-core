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
| [phase-01-arch.md](./phase-01-arch.md) | 아키텍처 설계 | ✅ 완료 |
| [phase-02-db.md](./phase-02-db.md) | DB 설계 (22개 테이블) | ✅ 완료 |
| [phase-03-api.md](./phase-03-api.md) | API 설계 (Hybrid 패턴, 65개 엔드포인트) | ✅ 완료 |
| [phase-04-ui.md](./phase-04-ui.md) | UI/UX 설계 (네비게이션, 화면별 명세, 상태 커버리지) | ✅ 완료 |
| [decisions/](./decisions/) | 주요 기술 결정 기록 | - |

## 단계별 로드맵

```
Phase 1: 아키텍처 설계 ✅
Phase 2: DB 설계 ✅
Phase 3: API 설계 ✅
Phase 4: UI/UX 설계 ✅
Phase 5: 프로젝트 초기화 + DB 마이그레이션
Phase 6: 기초 마스터 CRUD 구현
Phase 7: 핵심 재고 로직 구현 (입고/출고/조립)
```
