# 테스트 가이드

100% 테스트 커버리지가 목표입니다. 테스트는 빠르게 움직이면서도 자신감을 갖게 해줍니다.

## 프레임워크

- **Vitest** v4 — 빠른 테스트 러너 (Vite 기반)
- **@testing-library/react** — 컴포넌트 테스트
- **@testing-library/jest-dom** — DOM 매처 확장
- **jsdom** — 브라우저 환경 시뮬레이션

## 실행 방법

```bash
# 전체 테스트
npx vitest run

# 워치 모드
npx vitest

# 특정 파일
npx vitest run test/format.test.ts
```

## 현재 상태

- 총 **118개** 테스트 통과
- 10개 테스트 파일

## 디렉토리 구조

```
test/
├── setup.ts               # 테스트 환경 설정
├── format.test.ts         # 숫자/날짜 포맷 유틸
├── utils.test.ts          # escapeFilterValue 등 유틸
├── csv.test.ts            # CSV 생성/내보내기
├── api-error.test.ts      # ApiError, extractErrorMessage
├── api-auth.test.ts       # getAuthenticatedUser, requireRole
├── api-handler.test.ts    # withApiHandler 래퍼
├── validations.test.ts    # Zod 스키마 10종 검증
├── query-keys.test.ts     # TanStack Query 키 팩토리
└── cancel-routes.test.ts  # 취소 API Route 테스트
```

## 컨벤션

- 파일명: `{모듈명}.test.ts` 또는 `{모듈명}.regression-{N}.test.ts`
- describe/it 네스팅, 한국어 테스트 설명
- 외부 의존성은 모킹 (DB, API, Redis 등)
- 새 함수 작성 시 테스트 함께 작성
- 버그 수정 시 회귀 테스트 추가
- 조건 분기 추가 시 양쪽 경로 테스트
