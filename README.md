# inven-core

멀티테넌시 SaaS 재고수불시스템.
업체/창고/품목 관리, BOM 조립, 구매/입고/출고, FIFO/LIFO/가중평균 원가 계산을 지원합니다.

## 기술 스택

- **프론트엔드**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **백엔드**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **상태관리**: Zustand (클라이언트) + TanStack Query (서버)
- **폼**: React Hook Form + Zod

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

http://localhost:3000 에서 확인할 수 있습니다.

## 프로젝트 구조

```
inven-core/
├── src/app/          # Next.js App Router
├── public/           # 정적 파일
├── supabase/         # Supabase 설정 + 마이그레이션
├── .planning/        # 설계 문서
└── .doc/             # 프로젝트 참고 문서
```

## 설계 문서

- [아키텍처](.planning/phase-01-arch.md)
- [DB 설계](.planning/phase-02-db.md) — 22개 테이블, FIFO 로트 추적
- [API 설계](.planning/phase-03-api.md) — Hybrid 패턴, 65개 엔드포인트
- [UI/UX 설계](.planning/phase-04-ui.md) — 화면별 명세, 보고서 3종
- [디자인 프리뷰](.planning/design-preview.html) — UI 디자인 시안 미리보기
