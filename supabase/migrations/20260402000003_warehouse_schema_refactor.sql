-- 창고 스키마 리팩토링: code 제거, location→address, phone→contact
-- Eng Review 테스트 계획 (2026-04-02) 기반

-- 1. code 컬럼 제거 (UNIQUE 제약조건 자동 제거)
ALTER TABLE warehouses DROP COLUMN code;

-- 2. location → address 리네임
ALTER TABLE warehouses RENAME COLUMN location TO address;

-- 3. phone → contact 리네임 (varchar(20) → text 로 타입 변경, 이메일 등 다양한 형식 허용)
ALTER TABLE warehouses ALTER COLUMN phone TYPE text;
ALTER TABLE warehouses RENAME COLUMN phone TO contact;
