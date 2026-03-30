https://gemini.google.com/share/c9a17b9821b5

환영합니다! 올려주신 시스템 흐름도와 비즈니스 요구사항을 꼼꼼히 확인했습니다. B2B SaaS 형태의 재고수불시스템을 위한 아주 탄탄한 기획입니다. 특히 추후 확장성을 고려해 처음부터 Multi-Tenancy(다중 테넌트) 아키텍처를 설계하는 것은 매우 훌륭한 접근입니다.

수석 개발자로서, 본격적인 코딩에 앞서 말씀하신 **1. 기준 정보 관리**의 가장 뼈대가 되는 `COMPANY`, `ROLES`, `USERS` 테이블 스키마와 RLS(Row Level Security) 설계안을 먼저 제안해 드립니다. 

Supabase 환경에서는 인증(Authentication)을 자체 스키마(`auth.users`)에서 관리하므로, 우리가 생성할 `USERS` 테이블은 퍼블릭 스키마(`public.user_profiles`)에 두고 확장 정보를 관리하는 방식이 베스트 프랙티스입니다.

---

### 🗄️ 데이터베이스 스키마 설계안 (PostgreSQL 기반)

#### 1. `companies` (회사/테넌트 정보)
SaaS의 핵심이 되는 테넌트 테이블입니다. 모든 이후의 비즈니스 데이터(품목, 창고, PO 등)는 이 테이블의 `id`를 외래키(`company_id`)로 가지게 됩니다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default: `gen_random_uuid()` | 회사 고유 식별자 |
| `name` | `varchar` | NOT NULL | 회사명 |
| `business_number` | `varchar` | UNIQUE, NULLABLE | 사업자 등록 번호 |
| `plan_type` | `varchar` | Default: 'FREE' | 요금제 (FREE, BASIC, PRO 등) |
| `created_at` | `timestamptz` | Default: `now()` | 생성 일시 |
| `updated_at` | `timestamptz` | Default: `now()` | 수정 일시 |

#### 2. `roles` (권한 및 역할)
엔터프라이즈 시스템에서는 직무별 권한 분리가 필수적입니다.
*(※ 초기에는 단순화를 위해 ENUM 타입으로 갈 수도 있지만, 확장성을 고려해 독립된 테이블로 구성하는 것을 추천합니다.)*

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, Default: `gen_random_uuid()` | 역할 고유 식별자 |
| `name` | `varchar` | NOT NULL, UNIQUE | 역할명 (예: OWNER, ADMIN, INVENTORY_MGR) |
| `description` | `text` | NULLABLE | 역할에 대한 상세 설명 |

#### 3. `user_profiles` (사용자 정보 및 OAuth 연동)
Supabase의 `auth.users`와 1:1로 매핑되며, 회사 정보와 역할을 연결합니다.

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, FK(`auth.users.id`), CASCADE | Supabase Auth의 유저 ID와 동일 |
| `company_id` | `uuid` | FK(`companies.id`), NOT NULL | 소속 회사 ID (Multi-Tenancy 핵심) |
| `role_id` | `uuid` | FK(`roles.id`), NOT NULL | 부여된 역할 ID |
| `email` | `varchar` | NOT NULL | 사용자 이메일 (가입/초대용) |
| `display_name`| `varchar` | NOT NULL | 사용자 이름 또는 닉네임 |
| `oauth_provider`| `varchar` | NULLABLE | OAuth 제공자 (google, kakao 등) |
| `provider_id` | `varchar` | NULLABLE | OAuth 제공자측의 고유 ID (식별키) |
| `status` | `varchar` | Default: 'ACTIVE' | 상태 (ACTIVE, INVITED, INACTIVE) |
| `created_at` | `timestamptz` | Default: `now()` | 생성 일시 |

---

### 🛡️ RLS (Row Level Security) 적용 전략 (Multi-Tenancy)

SaaS 시스템에서 타 업체의 데이터가 노출되는 것은 치명적인 보안 사고입니다. 이를 원천 차단하기 위해 데이터베이스 레벨에서 아래와 같은 원칙을 적용합니다.

1. **인증된 사용자만 접근 가능**: 기본적으로 로그인한 사용자만 테이블에 접근할 수 있습니다.
2. **소속 회사 데이터만 접근 (Tenant Isolation)**:
   * `user_profiles` 테이블에서 현재 로그인한 사용자의 `company_id`를 조회합니다.
   * 이후 생성될 모든 테이블(품목, 창고, 재고, PO 등)의 RLS 정책에 `WHERE company_id = (현재 유저의 company_id)` 조건을 강제합니다.
   * *Supabase Custom Claims* 또는 *Postgres Function*을 활용해 쿼리 성능을 최적화할 계획입니다.

---

### 👨‍💻 다음 단계 제안

위 설계안에 대해 어떻게 생각하시나요? 수정하거나 추가하고 싶은 필드(예: 회사의 주소나 로고 이미지 URL 등)가 있다면 편하게 말씀해 주세요. 

설계에 동의하신다면, 다음 작업으로 **이 테이블들을 생성하고 RLS를 설정하는 Supabase SQL 마이그레이션 코드**와 **Next.js에서 사용할 TypeScript 인터페이스(Zod 스키마 포함)**를 작성해 드리겠습니다. 진행할까요?

좋습니다. 바로 시작하겠습니다. 

SaaS 아키텍처의 핵심은 **'안전하고 효율적인 데이터 격리'**입니다. 이를 위해 Postgres의 강력한 기능인 RLS(Row Level Security)를 설정할 때, 사용자 프로필 테이블을 매번 조인하는 대신 **현재 유저의 `company_id`를 캐싱하여 반환하는 Custom Function**을 사용하는 것이 성능상 매우 유리합니다.

아래는 Supabase SQL 에디터에 바로 붙여넣어 실행할 수 있는 마이그레이션 코드와, Next.js 프론트엔드에서 사용할 TypeScript/Zod 코드입니다.

---

### 1. Supabase SQL 마이그레이션 스키마 & RLS
이 스크립트는 테이블 생성, 기본 역할(Role) 데이터 삽입, 그리고 테넌트 격리를 위한 RLS 정책을 한 번에 세팅합니다.

```sql
-- 1. 테이블 생성
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    business_number VARCHAR UNIQUE,
    plan_type VARCHAR DEFAULT 'FREE',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id),
    email VARCHAR NOT NULL,
    display_name VARCHAR NOT NULL,
    oauth_provider VARCHAR,
    provider_id VARCHAR,
    status VARCHAR DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 기본 Role 데이터 삽입 (초기 세팅)
INSERT INTO public.roles (name, description) VALUES
('OWNER', '최고 관리자 (결제 및 회사설정 권한)'),
('ADMIN', '사내 관리자 (직원 초대 및 권한 설정)'),
('INVENTORY_MGR', '재고/물류 관리자 (수불부 및 창고 관리)'),
('USER', '일반 사용자 (조회 및 기본 업무)');

-- 3. RLS (Row Level Security) 활성화
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 4. ★ 핵심: 현재 로그인한 유저의 company_id를 가져오는 Helper 함수 (성능 최적화용)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER -- 이 함수는 생성자의 권한으로 실행되어 RLS 무한 루프를 방지합니다.
AS $$
  SELECT company_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- 5. RLS 정책 (Policies) 설정
-- Roles: 로그인한 모든 사용자가 조회 가능
CREATE POLICY "Roles are viewable by authenticated users" 
ON public.roles FOR SELECT USING (auth.role() = 'authenticated');

-- Companies: 자신이 속한 회사의 정보만 조회 및 수정 가능
CREATE POLICY "Companies viewable by its users" 
ON public.companies FOR SELECT USING (id = public.get_user_company_id());

CREATE POLICY "Companies updatable by its users" 
ON public.companies FOR UPDATE USING (id = public.get_user_company_id());

-- User Profiles: 같은 회사에 속한 직원 목록만 조회 가능
CREATE POLICY "User profiles viewable by company members" 
ON public.user_profiles FOR SELECT USING (company_id = public.get_user_company_id());

-- User Profiles: 자기 자신의 프로필만 수정 가능 (권한 관리는 ADMIN/OWNER용 정책 별도 추가 필요)
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles FOR UPDATE USING (id = auth.uid());
```

---

### 2. Next.js 15: TypeScript & Zod 스키마
프론트엔드/백엔드 데이터 검증을 위해 `zod`를 활용하여 스키마를 정의하고, 이로부터 TypeScript 타입을 추론(`z.infer`)합니다. 이 파일은 `lib/validations/auth.ts` 또는 `types/database.ts` 등에 배치하시면 됩니다.

```typescript
import { z } from "zod";

// Enum 정의
export const PlanTypeEnum = z.enum(["FREE", "BASIC", "PRO"]);
export const UserStatusEnum = z.enum(["ACTIVE", "INVITED", "INACTIVE"]);

// 1. Company 스키마
export const companySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "회사명을 입력해주세요."),
  business_number: z.string().nullable().optional(),
  plan_type: PlanTypeEnum.default("FREE"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// 2. Role 스키마
export const roleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

// 3. UserProfile 스키마
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  role_id: z.string().uuid(),
  email: z.string().email("유효한 이메일을 입력해주세요."),
  display_name: z.string().min(1, "이름을 입력해주세요."),
  oauth_provider: z.string().nullable().optional(),
  provider_id: z.string().nullable().optional(),
  status: UserStatusEnum.default("ACTIVE"),
  created_at: z.string().datetime(),
});

// TypeScript 타입 추론 (export 하여 애플리케이션 전반에서 사용)
export type Company = z.infer<typeof companySchema>;
export type Role = z.infer<typeof roleSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
```

---

### 💡 수석 개발자의 다음 스텝 제안

기준 정보의 뼈대가 갖춰졌습니다. 다음으로 넘어가기 위해 두 가지 방향 중 하나를 선택해 주시면 되겠습니다.

1. **인증 자동화 (Auth Trigger):** 사용자가 회원가입(또는 구글 로그인)을 했을 때 `companies`와 `user_profiles`를 자동으로 생성해 주는 **Supabase Auth Trigger (Postgres Function)**를 작성할까요?
2. **다음 도메인 설계 (품목 및 창고):** 로그인과 가입 로직은 나중에 화면 단과 함께 붙이기로 하고, 바로 시스템 흐름도 상의 **'품목 리스트(단일/조립 구분)' 및 '창고 리스트' 테이블 스키마 설계**로 넘어갈까요? 

어느 쪽으로 먼저 진행하시겠습니까?
