# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0.0] - 2026-04-01

### Added
- 기준정보(Reference Codes) 관리 기능 — 범용 코드 테이블로 타입별 보조 데이터(code_data1~9) 관리
- 기준정보 목록 페이지 — 타입 필터, 검색, 페이지네이션, sticky 컬럼
- 기준정보 추가/수정 다이얼로그 — Combobox 타입 선택(자유 입력 가능), code_data1~9 입력
- 기준정보 소프트 삭제 — is_active 플래그 기반
- DB RPC 2종 — get_reference_code_types (DISTINCT 타입 목록), create_reference_code (원자적 sort_order MAX+1)
- 사이드바 메뉴 — 기초 마스터 > 기준정보 추가
- Zod 스키마 단위 테스트 11건 + E2E 스모크 테스트 4건

### Fixed
- cmdk CommandItem.onSelect 소문자 변환 문제 — 원본 타입 변수를 직접 참조하도록 수정
- Supabase RPC 타입 단언(as any) 제거 — database.types.ts 재생성 후 정리
