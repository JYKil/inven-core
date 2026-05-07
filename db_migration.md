# inven-core 마이그레이션 체크리스트
> Vercel + Supabase → 리눅스 미니PC (PostgreSQL + Better Auth 이메일/비밀번호)

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
[x] 패키지 교체
    npm install better-auth pg @types/pg
    npm uninstall @supabase/supabase-js @supabase/ssr (Phase 4에서 제거 예정)

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

[ ] src/proxy.ts (미들웨어) 재작성
    - supabaseMiddleware → better-auth session 체크로 교체
    - 미승인 유저 리다이렉트 로직 유지

[ ] 기존 Supabase Auth users 데이터 이전
    - Google OAuth 유저는 임시 비밀번호 발급 or 재가입 안내
    - 관리자 승인 status 필드 이전
    - 역할 (super_admin / company_admin / normal) 이전

[ ] 로그인/회원가입 페이지에서 Google OAuth 버튼 제거
[ ] 관리자 승인 플로우 동작 확인
```

---

## Phase 4 — DB 쿼리 레이어 교체

**Supabase Client → Drizzle ORM (PostgreSQL 특화, 타입 안전)**

```
[ ] 패키지 설치
    npm install drizzle-orm pg
    npm install -D drizzle-kit @types/pg

[ ] drizzle.config.ts 생성

[ ] src/db/schema.ts 생성
    - 기존 24개 테이블을 Drizzle 스키마로 작성
    - src/types/ Supabase 자동생성 타입 참고

[ ] src/db/index.ts — DB 커넥션 풀 설정

[ ] RLS 정책 → 앱 레이어 권한 체크로 교체
    - 기존: Supabase RLS가 company_id 기반 자동 격리
    - 변경: 모든 쿼리에 .where(eq(table.companyId, session.companyId)) 추가
    - ⚠️ 누락 시 타사 데이터 노출 위험 — 전수 검토 필수

[ ] src/app/api/ 의 65개 엔드포인트 순차 교체
    - supabase.from('table').select() → db.select().from(table)
    - supabase.rpc('function') → 직접 SQL 또는 Drizzle 쿼리
    - 우선순위: 핵심 기능(입고/출고/재고) → 보조 기능(보고서/설정) 순

[ ] FIFO 로트 추적 RPC 함수 (취소 4종 포함) 재작성
    - supabase/ 폴더의 기존 마이그레이션 SQL 재활용 가능
```

---

## Phase 5 — 타입 정리

```
[ ] src/types/ 의 Supabase 자동생성 타입 파일 제거
[ ] Drizzle InferSelectModel / InferInsertModel 으로 타입 재생성
[ ] TypeScript 빌드 에러 전체 해소
    npx tsc --noEmit
```

---

## Phase 6 — 앱 배포

```
[ ] Dockerfile 작성 (Next.js standalone 빌드)
[ ] docker-compose.yml 에 app + postgres 묶기
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