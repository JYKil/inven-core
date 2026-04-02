# inven-core

멀티테넌시 SaaS 재고수불시스템.
업체/창고/품목 관리, BOM 조립, 구매/입고/출고, FIFO/LIFO/가중평균 원가 계산을 지원합니다.

## 기술 스택

- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **백엔드**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **상태관리**: Zustand (클라이언트) + TanStack Query (서버)
- **폼**: React Hook Form + Zod

## 서비스 URL

https://inven-core.vercel.app/

> 회원가입 후 관리자 승인이 완료되어야 서비스를 이용할 수 있습니다.
> Google OAuth는 현재 테스트 기간으로, 관리자가 추가한 계정만 로그인이 가능합니다.
> 테스트 계정 : kilga2401@naver.com / 24012401

## 주요 기능

- **기초 마스터**: 매입처(Vendor), 고객사(Customer), 창고, 품목, BOM, 기준정보(Reference Codes) 관리
- **구매/입고**: 매입처 선택, 발주서 생성, 입고 처리 (초과 입고 방지), 지급 관리
- **영업/출고**: 고객사 선택, 판매주문, FIFO 기반 자동 출고, 매출원가/이익 자동계산
- **조립**: BOM 기반 재료 소비 + 결과물 생성, 재료 가용성 사전확인
- **창고 이동**: 창고 간 재고 이동, FIFO 로트 단위 추적
- **취소/정정**: 출고·입고·조립·이동 취소 (역분개 방식, 감사 추적 보존)
- **보고서**: 재고 수불부, 창고별 재고 현황, 매출 보고서 (CSV 내보내기)
- **대시보드**: 재발주 알람, 처리 대기 건수, 매입/매출 요약
- **멀티테넌시**: 회사별 RLS 격리, 역할 기반 권한 (super_admin/company_admin/normal)

## 프로젝트 구조

```
inven-core/
├── src/
│   ├── app/            # Next.js App Router (페이지 + API Routes)
│   ├── components/     # 공통 UI 컴포넌트
│   ├── hooks/          # TanStack Query 커스텀 훅
│   ├── lib/            # 유틸리티 (포맷, CSV, API 핸들러)
│   ├── stores/         # Zustand 스토어
│   ├── types/          # TypeScript 타입 (Supabase 자동생성 포함)
│   └── proxy.ts        # 인증 미들웨어
├── test/               # 단위 테스트 (170개)
├── supabase/           # Supabase 설정 + 마이그레이션
├── .planning/          # 설계 문서
└── .doc/               # 프로젝트 참고 문서
```

## 설계 문서

- [아키텍처](.planning/phase-01-arch.md)
- [DB 설계](.planning/phase-02-db.md) — 24개 테이블, FIFO 로트 추적
- [API 설계](.planning/phase-03-api.md) — Hybrid 패턴, 65개 엔드포인트
- [UI/UX 설계](.planning/phase-04-ui.md) — 화면별 명세, 보고서 3종
- [롤백/정정 설계](.planning/phase-06-rollback.md) — 취소 RPC 4종, 역분개 방식
- [디자인 시스템](.planning/DESIGN.md) — 타이포그래피, 컬러, 레이아웃 규칙
- [디자인 프리뷰](https://jykil.github.io/inven-core/.planning/design-preview.html) — UI 디자인 시안 미리보기
