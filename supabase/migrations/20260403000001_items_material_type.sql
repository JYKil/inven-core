-- items 테이블에 material_type 컬럼 추가
-- 기준정보(reference_codes)의 code_type / code_data2에서 자동 매핑
ALTER TABLE items ADD COLUMN IF NOT EXISTS material_type TEXT;

-- 기존 item_type CHECK 제약 제거 후 확장
-- (basic, assembly → 더 이상 사용하지 않고 material_type으로 대체)
-- item_type은 하위 호환을 위해 유지하되, material_type이 실제 분류

COMMENT ON COLUMN items.material_type IS '품목 유형: Raw Material, WIP, Finished Good, Assemble Labor, Freight Overhead 등. reference_codes에서 자동 매핑.';
