-- category 데이터를 material_type으로 이관 후 category 컬럼 삭제
-- material_type이 비어있고 category에 값이 있는 경우만 복사
UPDATE items
SET material_type = category
WHERE material_type IS NULL AND category IS NOT NULL;

ALTER TABLE items DROP COLUMN category;
