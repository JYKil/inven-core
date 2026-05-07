# 프로젝트명 
inven-core

## 프로젝트 개요
재고수불시스템을 만드려고 함. 개요 이미지는 .doc/overview.jpeg 와 같음. 현재까지 정의된 내용은 .doc/memo1.md파일을 참고해줘.

## 기술 스택
- 프론트엔드: Next.js 15 + TypeScript
- 스타일링: Tailwind CSS + shadcn/ui
- 백엔드: Supabase (PostgreSQL + Auth + Storage + Realtime)
- 클라이언트 상태관리: Zustand (UI 전역 상태)
- 서버 상태관리: TanStack Query (서버 데이터 캐싱/자동 갱신)
- 폼 관리: React Hook Form + Zod
- API: Supabase Client + Next.js API Routes + Supabase rpc() (복잡한 비즈니스 로직)
- 파일 처리: Supabase Storage
- 타입 생성: supabase gen types (DB 스키마 → TypeScript 자동 생성)

## 작업 규칙
- 모든 작업을 시작하기 전에 `.planning/CHECKPOINT.md`와 `.planning/TODOS.md`를 먼저 읽고 현재 상태를 파악할 것
- 작업 완료 후에는 반드시 CHECKPOINT.md와 TODOS.md를 업데이트할 것
- 새로운 결정 사항이 생기면 CHECKPOINT.md의 "주요 결정 사항"에 추가할 것
- 오류 수정 시에도 반드시 원인 분석 → 수정 계획 수립 → 실행 순서로 진행할 것 (바로 코드 수정하지 말 것)

## 코딩 컨벤션

## Planning Context Management
### 계획 규모별 파일 분리 원칙
- 소규모 계획(~3개 파일): 인라인 작성 허용
- 중규모 계획(4~10개 파일): `.planning/` 디렉토리에 분리
- 대규모 계획(10개 이상 파일): 반드시 분리 + 인덱스 파일 생성

### Context 부족 감지 시 동작
1. 즉시 작업 중단하고 현재까지 내용을 파일로 저장
2. `.planning/CURRENT_PLAN.md` 에 진행 상황 기록
3. `.planning/CHECKPOINT.md` 에 다음 작업 목록 명시
4. 사용자에게 `/clear` 후 CHECKPOINT 파일 참조 요청