# Phase 1: 아키텍처 설계

## 상태
- [x] 설계 완료 (2026-03-30)

## 시스템 개요
재고수불시스템(inven-core)은 멀티테넌시 SaaS 구조의 재고 관리 시스템이다.
Next.js 15 프론트엔드와 Supabase(PostgreSQL) 백엔드로 구성되며,
복잡한 비즈니스 로직(FIFO/LIFO, BOM 조립, 재고 원가 계산)은 PostgreSQL function으로 처리한다.

## 아키텍처 다이어그램
```
┌─────────────────────────────────────────────────┐
│                   클라이언트                       │
│  Next.js 15 (App Router, Server Components)      │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Zustand  │ │ TanStack │ │ React Hook Form  │  │
│  │(UI 상태) │ │  Query   │ │    + Zod         │  │
│  └──────────┘ │(서버상태)│ └──────────────────┘  │
│               └──────────┘                       │
│  스타일링: Tailwind CSS + shadcn/ui               │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │ API Routes│ Supabase  │
        │ (래핑)    │ Client    │
        └───────────┼───────────┘
                    │
┌───────────────────┴─────────────────────────────┐
│                  Supabase                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │   Auth   │ │ Storage  │ │    Realtime      │  │
│  │ (OAuth)  │ │ (파일)   │ │  (재고 알림)     │  │
│  └──────────┘ └──────────┘ └──────────────────┘  │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │            PostgreSQL                     │    │
│  │  ┌─────────────┐  ┌───────────────────┐  │    │
│  │  │   Tables    │  │  DB Functions     │  │    │
│  │  │  (22개)     │  │  (rpc 6개)        │  │    │
│  │  │  + RLS      │  │  - FIFO 소비      │  │    │
│  │  │  + Triggers │  │  - 조립 처리      │  │    │
│  │  └─────────────┘  │  - 입고/출고      │  │    │
│  │                   └───────────────────┘  │    │
│  └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

## 확정 기술 스택

| 영역 | 기술 | 용도 |
|------|------|------|
| 프론트엔드 | Next.js 15 + TypeScript | App Router, Server Components |
| 스타일링 | Tailwind CSS + shadcn/ui | UI 컴포넌트 |
| 백엔드 | Supabase (PostgreSQL) | DB, Auth, Storage, Realtime |
| 클라이언트 상태 | Zustand | UI 전역 상태 (현재 회사, 필터 등) |
| 서버 상태 | TanStack Query | 서버 데이터 캐싱, 자동 갱신 |
| 폼 관리 | React Hook Form + Zod | 복잡한 폼 + 유효성 검증 |
| 타입 생성 | supabase gen types | DB 스키마 → TypeScript 타입 자동 생성 |

## 주요 컴포넌트

### 1. 프론트엔드 레이어
- **Server Components**: 초기 데이터 로딩, SEO 불필요하므로 주로 성능 최적화 목적
- **Client Components**: 인터랙티브 UI (폼, 테이블 필터링, 실시간 업데이트)
- **API Routes**: Supabase rpc 래핑, 복잡한 비즈니스 로직 호출 진입점

### 2. 상태 관리
- **Zustand**: 현재 선택된 회사, 사이드바 상태, 필터 조건 등 UI 상태
- **TanStack Query**: 재고 목록, 품목 목록, PO 목록 등 서버 데이터 (캐싱, 낙관적 업데이트, 자동 갱신)

### 3. 백엔드 레이어 (Supabase)
- **단순 CRUD**: Supabase 클라이언트 직접 사용 (partners, warehouses, items 등 마스터 데이터)
- **복잡한 비즈니스 로직**: PostgreSQL function → `supabase.rpc()` 호출
  - 입고 처리 (lot 생성 + inventory_summary 갱신)
  - 출고 처리 (FIFO lot 소비 + 원가 계산)
  - 조립 처리 (재료 소비 + 결과물 lot 생성)
  - 창고 이동 (출발지 소비 + 도착지 생성)

## 컴포넌트 간 통신

### 데이터 흐름
```
사용자 액션 → Client Component → TanStack Query mutation
  → API Route (선택적) → supabase.rpc() → PostgreSQL function
  → 트랜잭션 내 처리 (lot 생성/소비, summary 갱신, transaction 기록)
  → 결과 반환 → TanStack Query 캐시 갱신 → UI 업데이트
```

### 실시간 업데이트
```
inventory_summary 변경 → Supabase Realtime → TanStack Query 캐시 무효화 → UI 자동 갱신
```

## 핵심 아키텍처 결정

### ADR-001: Supabase rpc 하이브리드 패턴
- **결정**: 단순 CRUD는 Supabase 클라이언트, 복잡한 로직은 PostgreSQL function + rpc()
- **이유**: Supabase JS 클라이언트가 multi-statement 트랜잭션을 지원하지 않으므로, 재고 차감/조립 등 원자성이 필요한 작업은 DB function에서 처리해야 함
- **영향**: 핵심 비즈니스 로직이 PL/pgSQL로 작성됨 → DB 마이그레이션 관리 중요

### ADR-002: FIFO 로트 추적 구조
- **결정**: `inventory_lots` 테이블로 입고 단위별 수량/단가를 추적하고, 출고/조립 시 lot_date 순서로 소비
- **이유**: FIFO/LIFO/가중평균 전환 가능성을 위해 로트는 항상 기록. 로트 없이는 FIFO 원가 계산 불가
- **영향**: 모든 재고 변동이 로트 단위로 추적됨 → 정확한 원가 계산 가능

### ADR-003: 멀티테넌시 격리
- **결정**: 모든 비즈니스 테이블에 `company_id` + PostgreSQL RLS
- **이유**: DB 수준 격리로 애플리케이션 코드 실수에 의한 데이터 유출 방지
- **영향**: 모든 쿼리에 company_id 필터 자동 적용

### ADR-004: 원가 계산 회사 단위 설정
- **결정**: `companies.costing_method`로 회사 전체에 하나의 원가 계산 방식 적용
- **이유**: 회계 일관성 보장. 품목별 설정은 관리 복잡도 대비 실용성이 낮음

## 비기능적 요구사항
- **확장성**: 멀티테넌시 구조로 회사 추가 시 수평 확장. Supabase 프로젝트 단일 인스턴스로 시작
- **가용성**: Supabase 매니지드 서비스 기본 가용성 활용
- **보안**: RLS로 데이터 격리, OAuth 인증, role 기반 접근 제어
- **성능**: inventory_summary 캐시 테이블로 조회 최적화, 부분 인덱스로 FIFO 쿼리 가속
