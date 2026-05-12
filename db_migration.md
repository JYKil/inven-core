# inven-core 마이그레이션 체크리스트
> Vercel + Supabase → 리눅스 미니PC (PostgreSQL + Better Auth 이메일/비밀번호)

> 업데이트: 2026-05-12 코드 기준 현황 반영

---

## 현재 상태 요약

| 영역 | 상태 | 메모 |
|------|------|------|
| **DB 인프라** | 완료 | 미니PC PostgreSQL 접속 정보는 `.env.local`에 반영됨 |
| **Better Auth 기본 배선** | 완료 | `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/app/api/auth/[...all]/route.ts`, `src/proxy.ts` 생성/교체 완료 |
| **Supabase Auth 제거** | 진행 중 | 인증 화면/레이아웃/승인 대기/온보딩은 전환 완료, hooks/settings의 Supabase 세션 조회는 Phase 4 쿼리 교체와 함께 제거 필요 |
| **Google OAuth 제거** | 완료 | Google 버튼 및 `/auth/callback` Supabase 콜백 제거 완료 |
| **Supabase Query 제거** | 미완료 | `src/hooks/*`, 거래/마스터 API, settings 화면에 Supabase client/RPC 호출 잔존 |
| **Drizzle 도입** | 미시작 | `package.json`에 Drizzle 의존성/설정 파일 없음 |
| **배포 파일** | 미시작 | `Dockerfile`, `docker-compose.yml` 없음 |
| **검증 상태** | 부분 통과 | Phase 3 변경 파일 기준 타입 오류 없음, 전체 `tsc`는 Phase 4/5 잔여 Supabase 코드로 실패 |

## 다음 우선순위

```
1. 기존 Supabase Auth users 데이터 이전 전략 확정 및 실행
2. Drizzle 패키지와 schema/index/config 추가
3. 서버 API 15개 + 클라이언트 hooks 전수 쿼리 교체
4. hooks/settings의 Supabase 세션 조회 제거
5. Supabase 패키지/타입/헬퍼 제거 후 TypeScript 빌드 확인
```

## 2026-05-12 Phase 3 작업 결과

```
[x] 이메일/비밀번호 로그인/회원가입을 Better Auth 클라이언트로 전환
[x] Google OAuth 버튼 제거
[x] `/auth/callback` Supabase OAuth 콜백 라우트 삭제
[x] pending/onboarding/dashboard/admin layout의 Supabase Auth 세션 조회 제거
[x] 로그아웃을 Better Auth signOut으로 전환
[x] 관리자 승인/역할 변경 API 추가
    - `/api/admin/users`
    - profiles와 Better Auth user.role/user.companyId 동시 갱신
[x] 현재 세션 조회 API 추가
    - `/api/auth/me`
[x] 기존 profiles 기반 Better Auth 사용자 이전 스크립트 추가
    - `scripts/migrate-auth-users-from-profiles.mjs`
[x] Better Auth user/account ID를 UUID로 생성하도록 설정
```

### 추가/변경된 주요 파일

```
src/app/(auth)/login/page.tsx
src/app/(auth)/signup/page.tsx
src/app/(auth)/pending/page.tsx
src/app/(auth)/onboarding/page.tsx
src/app/(dashboard)/layout.tsx
src/app/(dashboard)/admin/layout.tsx
src/app/(dashboard)/admin/users/page.tsx
src/app/api/auth/me/route.ts
src/app/api/auth/register-pending/route.ts
src/app/api/admin/users/route.ts
src/components/layout/top-bar.tsx
src/components/layout/app-sidebar.tsx
src/lib/auth.ts
src/lib/db/auth-admin.ts
src/lib/email/resend.ts
scripts/migrate-auth-users-from-profiles.mjs
```

### 검증 메모

```bash
node --check scripts/migrate-auth-users-from-profiles.mjs
node --check scripts/migrate-better-auth.mjs
```

```
[x] 신규/수정 migration script 문법 확인
[x] 인증 화면/레이아웃/API 범위에서 Supabase Auth 호출 제거 확인
    rg "createClient\(|supabase\.auth|signInWithOAuth|auth/callback|refreshSession|createServerSupabaseClient" \
      src/app/(auth) src/app/(dashboard)/layout.tsx src/app/(dashboard)/admin/layout.tsx \
      src/components/layout src/app/api/auth src/proxy.ts src/lib/email/resend.ts
    → 결과 없음
[ ] 전체 TypeScript 빌드
    npx tsc --noEmit
    → 실패: Phase 4/5 잔여 Supabase helper import 및 기존 hooks 타입 오류
```

---

## 변경 범위 요약

| 항목 | 기존 | 변경 |
|------|------|------|
| **DB** | Supabase PostgreSQL (클라우드) | 미니PC PostgreSQL 16 |
| **Auth** | Supabase Auth + Google OAuth | Better Auth 이메일/비밀번호만 |
| **RLS** | Supabase Row Level Security | 앱 레이어 권한 체크로 대체 |
| **배포** | Vercel | 미니PC Docker |
| **Google OAuth** | ✅ 사용 중 | ❌ 제거 |

---

## Phase 0 — 사전 분석 (작업 전 필수)

```
[x] supabase/ 폴더의 마이그레이션 SQL 파일 전체 파악
    → 테이블 구조, RLS 정책, RPC 함수 목록 확인
[x] src/proxy.ts (미들웨어) 열어서 Auth 흐름 파악
[x] src/types/ 에서 Supabase 자동생성 타입 파일 확인
[x] src/ 전체에서 supabase 클라이언트 호출 위치 파악
    → grep -r "supabase" src/ --include="*.ts" -l
[x] Storage 실제 사용 여부 확인 (파일 업로드 기능 있는지)
[x] Realtime 실제 사용 여부 확인 (subscribe 코드 있는지)
```

> 분석 결과 상세: `.planning/migration-analysis.md`

---

## Phase 1 — 인프라 준비 (미니PC)

```
[x] Docker + Docker Compose 설치
[x] PostgreSQL 16 컨테이너 실행
[x] psql 접속 테스트 확인
```

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: inven
      POSTGRES_PASSWORD: yourpassword
      POSTGRES_DB: inven_db
    volumes:
      - ./pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
```

---

## Phase 2 — DB 마이그레이션

```
[x] Supabase 클라우드에서 public 스키마 덤프
[x] RLS 정책 별도 추출 (백업용으로만 보관)
[x] 미니PC PostgreSQL에 복원
[x] 테이블 24개 모두 정상 복원됐는지 확인
[x] 운영 데이터 row 수 검증 (클라우드 vs 로컬 비교)
```

```bash
# Supabase 클라우드에서 덤프
pg_dump \
  "postgresql://postgres:[PW]@db.[REF].supabase.co:5432/postgres" \
  --schema=public \
  --no-owner --no-acl \
  -f inven_dump.sql

# 미니PC에 복원
psql "postgresql://inven:yourpassword@localhost:5432/inven_db" \
  -f inven_dump.sql
```

---

## Phase 3 — Auth 교체 (이메일/비밀번호만)

**Better Auth 선택 (Next.js 15 + TypeScript에 최적)**

```
[x] Better Auth 패키지 추가
    better-auth, pg, @types/pg 설치 확인

[ ] Supabase Auth 패키지/코드 제거
    - package.json에는 @supabase/* 의존성이 없지만 코드 import는 잔존
    - src/lib/supabase/*, src/types/database.ts 제거는 Phase 4/5 이후 진행

[x] better-auth DB 스키마 마이그레이션 실행
    node scripts/migrate-better-auth.mjs
    → user, session, account, verification 테이블 생성
    → user 테이블에 role(text), companyId(text) 컬럼 포함

[x] src/lib/auth.ts 생성
    - betterAuth + pg Pool adapter (DATABASE_URL 환경변수)
    - emailAndPassword 활성화
    - role additionalField (defaultValue: 'pending', input: false)
    - companyId additionalField (nullable, input: false)
    - nextCookies() 플러그인 (Next.js App Router 쿠키 처리)

[x] src/app/api/auth/[...all]/route.ts 생성
    - toNextJsHandler(auth) — Better Auth 라우트 핸들러

[x] src/lib/auth-client.ts 생성
    - createAuthClient — signIn, signUp, signOut, useSession export

[x] src/proxy.ts (미들웨어) 재작성
    - supabaseMiddleware → better-auth session 체크로 교체
    - 미승인 유저 리다이렉트 로직 유지

[ ] 기존 Supabase Auth users 데이터 이전
    - Google OAuth 유저는 임시 비밀번호 발급 or 재가입 안내
    - 관리자 승인 status 필드 이전
    - 역할 (super_admin / company_admin / normal) 이전
    - `scripts/migrate-auth-users-from-profiles.mjs` 추가 완료
    - 실제 실행 전 임시 비밀번호 전달/공지 방식 확정 필요

[x] 로그인/회원가입 페이지에서 Google OAuth 버튼 제거
[x] 로그인 페이지를 authClient.signIn.email 기반으로 교체
[x] 회원가입 페이지를 authClient.signUp.email 기반으로 교체
[x] 로그아웃 버튼을 authClient.signOut 기반으로 교체
    - TopBar / pending / onboarding 로그아웃 전환
[x] `/auth/callback` Supabase OAuth 콜백 라우트 제거
[x] pending/onboarding 페이지의 Supabase 세션 확인 로직 제거
[x] 관리자 승인 플로우 동작 확인
    - `/api/admin/users` 추가: 승인/역할 변경 시 기존 profiles와 Better Auth `user.role`, `user.companyId` 동시 갱신
    - 대시보드/admin 레이아웃 권한 체크를 Better Auth 세션 기반으로 전환
```

---

## Phase 4 — DB 쿼리 레이어 교체

**Supabase Client → Drizzle ORM (PostgreSQL 특화, 타입 안전)**

```
[ ] 패키지 설치
    npm install drizzle-orm pg
    npm install -D drizzle-kit @types/pg
    → 현재 package.json 기준 drizzle-orm/drizzle-kit 없음

[ ] drizzle.config.ts 생성

[ ] src/db/schema.ts 생성
    - 기존 24개 테이블을 Drizzle 스키마로 작성
    - src/types/ Supabase 자동생성 타입 참고

[ ] src/db/index.ts — DB 커넥션 풀 설정

[ ] RLS 정책 → 앱 레이어 권한 체크로 교체
    - 기존: Supabase RLS가 company_id 기반 자동 격리
    - 변경: 모든 쿼리에 .where(eq(table.companyId, session.companyId)) 추가
    - ⚠️ 누락 시 타사 데이터 노출 위험 — 전수 검토 필수

[ ] src/app/api/ 의 서버 엔드포인트 순차 교체
    - supabase.from('table').select() → db.select().from(table)
    - supabase.rpc('function') → 직접 SQL 또는 Drizzle 쿼리
    - 우선순위: 핵심 기능(입고/출고/재고) → 보조 기능(보고서/설정) 순
    - 현재 코드 기준 `src/app/api` 파일 16개 중 Better Auth 라우트 1개 제외, 15개가 Supabase 의존

[ ] FIFO 로트 추적 RPC 함수 (취소 4종 포함) 재작성
    - supabase/ 폴더의 기존 마이그레이션 SQL 재활용 가능

[ ] 클라이언트 hooks의 Supabase 호출 제거
    - use-items, use-warehouses, use-vendors, use-customers
    - use-purchase-orders, use-goods-receipts, use-sales-orders
    - use-assembly-orders, use-warehouse-transfers, use-inventory
    - use-bom, use-dashboard, use-reports, use-reference-codes, use-po-payments
```

---

## Phase 5 — 타입 정리

```
[ ] src/types/ 의 Supabase 자동생성 타입 파일 제거
    - src/types/database.ts
    - src/lib/supabase/database.types.ts

[ ] src/lib/supabase/* 제거
    - admin.ts, client.ts, middleware.ts, server.ts

[ ] Drizzle InferSelectModel / InferInsertModel 으로 타입 재생성
[ ] TypeScript 빌드 에러 전체 해소
    npx tsc --noEmit
```

---

## Phase 6 — 앱 배포

```
[ ] Dockerfile 작성 (Next.js standalone 빌드)
[ ] docker-compose.yml 에 app + postgres 묶기
    - 현재 repo 루트에 Dockerfile/docker-compose.yml 없음

[ ] .env.production 작성
[ ] docker compose up -d 로 전체 기동
[ ] Nginx 리버스 프록시 설정 (3000 → 80/443)
[ ] Cloudflare Tunnel 또는 Let's Encrypt HTTPS 설정
```

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next/standalone ./
COPY .next/static ./.next/static
CMD ["node", "server.js"]
```

```bash
# .env.production
DATABASE_URL=postgresql://inven:pw@postgres:5432/inven_db
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=https://your-domain.com
RESEND_API_KEY=...
```

---

## Phase 7 — 검증 & 컷오버

```
[ ] 전체 E2E 테스트 실행
    npx playwright test

[ ] 단위 테스트 170개 통과 확인
    npx vitest run

[ ] 멀티테넌시 격리 수동 테스트
    - 회사 A 계정으로 회사 B 데이터 접근 불가 확인

[ ] FIFO 원가계산 결과값 클라우드 버전과 비교 검증
[ ] 이메일/비밀번호 로그인 흐름 전체 테스트
[ ] 관리자 승인 플로우 테스트
[ ] CSV 내보내기 기능 테스트
[ ] Vercel 병행 운영 후 이상 없으면 컷오버
[ ] DNS 전환 (Vercel → 미니PC 도메인)
[ ] Supabase 클라우드 플랜 해지
```

---

## 작업 규모 예상

| Phase | 예상 공수 | 난이도 |
|-------|----------|--------|
| 0 사전 분석 | 1일 | 🟢 |
| 1 인프라 준비 | 반나절 | 🟢 |
| 2 DB 마이그레이션 | 반나절 | 🟢 |
| 3 Auth 교체 (이메일만) | **1~2일** | 🟡 |
| 4 쿼리 교체 (65개 엔드포인트) | **5~10일** | 🔴 |
| 5 타입 정리 | 1~2일 | 🟡 |
| 6 앱 배포 | 1일 | 🟡 |
| 7 검증 & 컷오버 | 2~3일 | 🟡 |

> ⚠️ **핵심 주의사항**: RLS → 앱 레이어 권한 체크 전환 시
> 모든 쿼리에 company_id 필터 누락 없는지 전수 검토 필수.
> 멀티테넌시 격리가 깨지면 타사 데이터 노출로 이어짐.
