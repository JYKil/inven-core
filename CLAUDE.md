# 프로젝트명 
inven-code

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

## gstack
- 웹 브라우징은 항상 `/browse` 스킬을 사용할 것
- `mcp__claude-in-chrome__*` 도구는 절대 사용하지 말 것
- 사용 가능한 스킬: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /connect-chrome, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn
- gstack 스킬이 동작하지 않으면 `cd .claude/skills/gstack && ./setup` 을 실행하여 바이너리를 빌드하고 스킬을 등록할 것

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

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Design System
Always read .planning/DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.