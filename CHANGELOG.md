# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- BOM 전용 관리 페이지 (/bom) — 아코디언 테이블, 2단계 하위 BOM 펼침, 상태 필터(활성/비활성)
- BOM 생성 페이지 (/bom/new) — 결과품목 Combobox, 순환 BOM 방지, 버전 자동 부여
- 발주서 비용(expense) 라인 지원 — 품목 없이 매입품명+금액만 입력 가능
- 발주서 엑셀 스타일 플랫 테이블 — 계약일자/번호/업체명/매입품/구분/수량/단가/금액/합계/비고
- 품목 목록 컬럼 변경 — Code, Material, Material Type, Material Describe, BOM
- 지급 초과 방지 — 잔액 이상 지급 시 클라이언트+서버 양쪽에서 차단

### Changed
- BOM 생성/버전 생성을 DB RPC 트랜잭션으로 전환 (create_bom, create_bom_version) — 부분 실패 방지
- PO 생성을 API Route + RPC로 전환 (create_purchase_order) — 서버에서 company_id 주입, Zod 검증
- 지급 등록을 API Route + RPC로 전환 (create_po_payment) — 서버에서 누적액 검증
- PO 총액 계산을 DB numeric 연산으로 이동 — 부동소수점 정밀도 문제 해결
- 지급 표시 금액에 Math.round 적용 — 잔액/지급율 소수점 정밀도 보장

### Security
- BOM/PO/지급 RPC에 소유권(company_id) 검증 추가 — 품목/업체 타사 접근 차단
- BOM 버전 자동 부여에 FOR UPDATE 잠금 — 동시 요청 시 버전 번호 충돌 방지
- 지급 등록 RPC에 FOR UPDATE 잠금 — 동시 지급 시 초과 방지

---

## [0.2.0.0] - 2026-04-01

### Added
- 기준정보(Reference Codes) 관리 기능 — 범용 코드 테이블로 타입별 보조 데이터(code_data1~9) 관리
- 기준정보 목록 페이지 — 타입 필터, 검색, 페이지네이션, sticky 컬럼
- 기준정보 추가/수정 다이얼로그 — Combobox 타입 선택(자유 입력 가능), code_data1~9 입력
- 기준정보 소프트 삭제 — is_active 플래그 기반
- DB RPC 2종 — get_reference_code_types (DISTINCT 타입 목록), create_reference_code (원자적 sort_order MAX+1)
- 사이드바 메뉴 — 기초 마스터 > 기준정보 추가
- Zod 스키마 단위 테스트 11건 + E2E 스모크 테스트 4건
- 거래처(partners) 테이블을 매입처(vendors)와 고객사(customers)로 분리
- 매입처 관리 페이지 — 은행/계좌 정보, 지급통화 관리
- 고객사 관리 페이지 — 입금통화 관리
- 발주서는 매입처(vendor), 판매주문은 고객사(customer)와 연결
- DB 마이그레이션 — FK 전환, RPC 수정(report_sales, dashboard_summary), partners DROP

### Fixed
- cmdk CommandItem.onSelect 소문자 변환 문제 — 원본 타입 변수를 직접 참조하도록 수정
- Supabase RPC 타입 단언(as any) 제거 — database.types.ts 재생성 후 정리
- zodResolver 타입 호환성 — zod 4 `.default()` 입력 타입 불일치 수정
