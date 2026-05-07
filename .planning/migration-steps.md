# 마이그레이션 작업 순서

---

## Phase 2 — DB 마이그레이션 ✅ 완료

### 사전 확인 사항

Supabase 대시보드 → 상단 **Connect** 버튼 클릭
→ **Session Pooler** 탭의 URI 복사 (IPv4 환경이면 Direct connection 불가)

> 화면에 "Not IPv4 compatible" 경고가 뜨면 반드시 Session Pooler URI 사용

### 1단계 — Supabase 클라우드 덤프 (맥에서 실행) ✅

```bash
# pg_dump 없으면 먼저 설치
brew install libpq && brew link --force libpq

# public 스키마 전체 덤프
pg_dump "postgresql://postgres.oftpwwxvwlszspnfvckh:[비밀번호]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" --schema=public --no-owner --no-acl -f inven_dump.sql
```

### 2단계 — RLS 정책 별도 추출 (백업용, 복원 안 함) ✅

```bash
pg_dump "postgresql://postgres.oftpwwxvwlszspnfvckh:[비밀번호]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" --schema=public --no-owner --no-acl --section=post-data -f inven_rls_backup.sql
```

### 3단계 — 덤프 파일을 미니PC로 전송 ✅

```bash
scp ~/inven_dump.sql kilga@192.168.75.205:~/postgres/
```

### 4단계 — 미니PC에서 복원 ✅

```bash
psql "postgresql://inven:2401@localhost:5432/inven_db" -f inven_dump.sql
```

### 5단계 — 테이블 24개 확인 ✅

```sql
SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
-- 결과: 24
```

### 6단계 — row 수 검증 ✅

복원 시 COPY 숫자와 로컬 n_live_tup 일치 확인 완료.

---

## Phase 3 — Auth 교체 (이메일/비밀번호만)

> Google OAuth는 나중에 별도 추가 예정

### 개요

Supabase Auth가 하던 역할:
- 로그인/회원가입 처리
- 세션 관리 (쿠키)
- 미들웨어에서 로그인 여부 체크
- `auth.users` 테이블로 유저 관리

Better Auth로 교체 후:
```
기존: supabase.auth.signIn() → auth.users 테이블
변경: better-auth signIn() → better-auth 자체 테이블 (users, sessions, accounts)
```

### 1단계 — 패키지 교체 ✅

```bash
npm install better-auth
npm uninstall @supabase/supabase-js @supabase/ssr
```

### 2단계 — Better Auth DB 테이블 생성 ✅

```bash
npx better-auth migrate
```

### 3단계 — src/lib/auth.ts 작성

- 이메일/비밀번호 provider만 설정
- PostgreSQL adapter 연결
- 관리자 승인 커스텀 필드 추가 (isApproved 등)

### 4단계 — 미들웨어 재작성 (src/proxy.ts)

- supabaseMiddleware → better-auth session 체크로 교체
- 미승인 유저 리다이렉트 로직 유지

### 5단계 — 기존 유저 데이터 이전

- Supabase `profiles` 테이블 유저들 → Better Auth `users` 테이블로 이전
- Google OAuth 유저는 임시 비밀번호 발급 또는 재가입 안내
- 역할 (super_admin / company_admin / normal) 이전

### 6단계 — 로그인 페이지 정리

- Google OAuth 버튼 제거 (나중에 다시 추가 예정)
- 관리자 승인 플로우 동작 확인

### 체크리스트

```
[x] 패키지 교체 완료
[x] Better Auth DB 테이블 생성 (user, session, account, verification + role/companyId 컬럼)
[x] src/lib/auth.ts 작성
    - betterAuth + pg Pool adapter
    - emailAndPassword 활성화
    - role (default: 'pending'), companyId additionalFields
    - nextCookies() 플러그인 (Next.js 쿠키 처리)
[x] src/app/api/auth/[...all]/route.ts 생성 (Better Auth 라우트 핸들러)
[x] src/lib/auth-client.ts 생성 (클라이언트용 authClient)
[ ] src/proxy.ts 미들웨어 재작성
[ ] 기존 유저 데이터 이전
[ ] 로그인 페이지 Google OAuth 버튼 제거
[ ] 관리자 승인 플로우 확인
```
