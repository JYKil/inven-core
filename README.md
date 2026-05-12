# inven-core

멀티테넌시 SaaS 재고수불시스템.
업체/창고/품목 관리, BOM 조립, 구매/입고/출고, FIFO/LIFO/가중평균 원가 계산을 지원합니다.

> 현재 저장소는 Vercel + Supabase에서 리눅스 미니PC + PostgreSQL + Better Auth로 이전 중입니다.
> Phase 3(Auth 교체)는 완료됐고, Phase 4(DB 쿼리 레이어 교체)가 다음 작업입니다.

## 기술 스택

- **프론트엔드**: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **백엔드**: Next.js App Router API Routes
- **DB**: PostgreSQL 16 (리눅스 미니PC)
- **인증**: Better Auth 이메일/비밀번호
- **상태관리**: Zustand (클라이언트) + TanStack Query (서버)
- **폼**: React Hook Form + Zod
- **메일**: Resend

## 마이그레이션 상태

- **완료**: DB 인프라 준비, public 스키마/데이터 복원, Better Auth 기본 배선, Google OAuth 제거, 기존 profiles 사용자 3명 Better Auth 이전
- **진행 예정**: Drizzle 도입, Supabase client/RPC 기반 hooks/API 교체, Supabase helper/type 제거, Docker 배포 파일 작성
- **검증 상태**: Phase 3 스크립트와 auth 전환 범위는 통과, 전체 TypeScript 빌드는 Phase 4/5 잔여 Supabase 코드로 실패

자세한 작업 현황은 [db_migration.md](db_migration.md)를 기준으로 관리합니다.

## 로컬 실행

```bash
npm install
npm run dev
```

필수 환경변수는 `.env.local`에 둡니다.

```bash
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=...
```

## Auth/DB 마이그레이션 명령

Better Auth 테이블 생성/보정:

```bash
node scripts/migrate-better-auth.mjs
```

기존 `profiles` 사용자 이전 사전 확인:

```bash
node scripts/migrate-auth-users-from-profiles.mjs --dry-run
```

기존 `profiles` 사용자 실제 이전:

```bash
node scripts/migrate-auth-users-from-profiles.mjs
```

실제 이전 시 `better-auth-temporary-passwords.csv`가 생성됩니다. 이 파일은 임시 비밀번호를 포함하므로 `.gitignore`에 등록되어 있고 커밋하면 안 됩니다.

## 주요 기능

- **기초 마스터**: 매입처(Vendor), 고객사(Customer), 창고, 품목, BOM, 기준정보(Reference Codes) 관리
- **구매/입고**: 매입처 선택, 발주서 생성, 입고 처리 (초과 입고 방지), 지급 관리
- **영업/출고**: 고객사 선택, 판매주문, FIFO 기반 자동 출고, 매출원가/이익 자동계산
- **조립**: BOM 기반 재료 소비 + 결과물 생성, 재료 가용성 사전확인
- **창고 이동**: 창고 간 재고 이동, FIFO 로트 단위 추적
- **취소/정정**: 출고·입고·조립·이동 취소 (역분개 방식, 감사 추적 보존)
- **보고서**: 재고 수불부, 창고별 재고 현황, 매출 보고서 (CSV 내보내기)
- **대시보드**: 재발주 알람, 처리 대기 건수, 매입/매출 요약
- **멀티테넌시**: 회사별 데이터 격리, 역할 기반 권한 (super_admin/company_admin/normal)

## 프로젝트 구조

```
inven-core/
├── src/
│   ├── app/            # Next.js App Router (페이지 + API Routes)
│   ├── components/     # 공통 UI 컴포넌트
│   ├── hooks/          # TanStack Query 커스텀 훅
│   ├── lib/            # 인증, 유틸리티, API 핸들러
│   ├── stores/         # Zustand 스토어
│   ├── types/          # TypeScript 타입
│   └── proxy.ts        # 인증 미들웨어
├── test/               # 단위 테스트 (170개)
├── scripts/            # DB/Auth 마이그레이션 스크립트
├── supabase/           # 기존 Supabase SQL 마이그레이션 보관
├── .planning/          # 설계 문서
├── db_migration.md     # 미니PC/PostgreSQL/Better Auth 이전 체크리스트
└── .doc/               # 프로젝트 참고 문서
```

## 설계 문서

- [DB/Auth 마이그레이션 체크리스트](db_migration.md)
- [아키텍처](.planning/phase-01-arch.md)
- [DB 설계](.planning/phase-02-db.md) — 24개 테이블, FIFO 로트 추적
- [API 설계](.planning/phase-03-api.md) — Hybrid 패턴, 65개 엔드포인트
- [UI/UX 설계](.planning/phase-04-ui.md) — 화면별 명세, 보고서 3종
- [롤백/정정 설계](.planning/phase-06-rollback.md) — 취소 RPC 4종, 역분개 방식
- [디자인 시스템](.planning/DESIGN.md) — 타이포그래피, 컬러, 레이아웃 규칙
