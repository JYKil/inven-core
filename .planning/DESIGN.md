# Design System — inven-core

## Product Context
- **What this is:** 재고수불관리 시스템. BOM 조립(2단계), FIFO/LIFO/가중평균 원가계산, PO 관리, 창고 간 이동, 매출/발주 알람 기능.
- **Who it's for:** 제조업/유통업 중소기업의 재고, 구매, 영업 담당자
- **Space/industry:** 재고관리 SaaS (inFlow, Cin7, ERP류와 경쟁)
- **Project type:** 대시보드 중심 업무용 웹앱

## Aesthetic Direction
- **Direction:** Industrial Refined (산업 정밀)
- **Decoration level:** Intentional — 오프화이트 배경의 미세한 질감으로 물성 부여. 장식은 최소화하되 차갑지 않게.
- **Mood:** 공장 사무실의 수불대장에서 영감. 따뜻하고 단단한 산업용 도구. 데이터가 많은 것을 숨기지 않고, 빼곡한 숫자 자체가 아름다운 디자인 요소가 되는 미감.
- **Reference sites:** inFlow, Cin7 (경쟁 분석 대상, 차별화 방향 반대)

## Typography
- **Display/Hero:** Geist — 깔끔한 기하학적 산세리프. 제목과 KPI 대형 숫자에 사용. 무게감 있는 헤딩.
- **Body:** Pretendard Variable — 한글 가독성 최고, tabular figures 지원. 본문, UI 레이블, 테이블 셀 전반.
- **UI/Labels:** Pretendard Variable (Body와 동일)
- **Data/Tables:** JetBrains Mono — 모노스페이스로 숫자 정렬 완벽. 0/O, 1/l 구분 명확. 재고 수량, 금액, 단가 등 숫자 핵심 셀에 사용.
- **Code:** JetBrains Mono
- **Loading:** Pretendard(CDN: cdn.jsdelivr.net/gh/orioncactus/pretendard), Geist(CDN: cdn.jsdelivr.net/npm/geist), JetBrains Mono(Google Fonts)
- **Scale:**
  - H1 (Page Title): Geist Bold 28px / tracking -0.02em
  - H2 (Section): Geist SemiBold 20px / tracking -0.01em
  - H3 (Card Title): Pretendard Medium 15px
  - Body: Pretendard Regular 14px / line-height 1.6
  - Table Cell: Pretendard Regular 13px
  - Table Number: JetBrains Mono Regular 13px
  - KPI Large: Geist Bold 36px / tracking -0.02em
  - Caption: Pretendard Regular 12px

## Color
- **Approach:** Restrained — 1개 주황 액센트 + 따뜻한 뉴트럴. 색상은 의미 있을 때만 사용.
- **Primary (Accent):** #D4642A — 산업용 주황. 파란색 SaaS와 완전히 다른 포지셔닝. CTA, 중요 액션, 활성 상태.
- **Primary Hover:** #BF5520
- **Secondary:** #2B7A6F — 짙은 틸. 주황과 보색 관계. 정상/완료/성공 상태.
- **Background:** #F5F0EB — 따뜻한 오프화이트, 모조지 느낌. 순백이 아닌 온기.
- **Surface:** #FEFCF9 — 카드, 패널 배경. 배경보다 약간 밝은 종이.
- **Surface Elevated:** #FFFFFF — 모달, 드롭다운 등 최상위 레이어만 순백.
- **Border:** #E0D8CF — 따뜻한 회색 테두리. 테이블 선.
- **Neutrals:**
  - Primary Text: #1A1714 (먹색 검정, 순흑 아님)
  - Secondary Text: #6B6158 (따뜻한 중간 톤)
  - Muted Text: #9C9189 (비활성, 타임스탬프, 캡션)
  - Disabled: #C4BBB2 (비활성 요소)
- **Semantic:**
  - Success: #2B7A6F (입고 완료, 재고 정상)
  - Warning: #C4901A (안전재고 근접, 황갈색)
  - Error: #B83A2A (재고 부족, 미결제, 적갈색)
  - Info: #4A7B94 (안내 메시지, 차분한 청회색)
- **Chart Colors:** #D4642A, #2B7A6F, #4A7B94, #C4901A, #8B6B4A, #6B8F71
- **Dark mode:**
  - Background: #141210
  - Surface: #1E1B18
  - Surface Elevated: #282420
  - Border: #3A3530
  - Primary Text: #E8E0D6
  - Secondary Text: #A09688
  - Muted Text: #706860
  - Accent Primary: #E8773F (밝게 조정)
  - Accent Secondary: #3DA396

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable
- **Scale:**
  - space-1: 4px (인라인 아이콘 간격)
  - space-2: 8px (테이블 셀 내부 패딩)
  - space-3: 12px (폼 필드 간격)
  - space-4: 16px (카드 내부 패딩)
  - space-5: 24px (섹션 간 간격)
  - space-6: 32px (페이지 섹션 분리)
  - space-8: 48px (페이지 상하 마진)

## Layout
- **Approach:** Grid-disciplined — 사이드바 + 데이터 테이블 중심. 예측 가능한 구조.
- **Sidebar:** 접힌 상태 기본(56px, 아이콘만). 호버 시 플로팅 패널 확장(220px). 테이블 수평 공간 최대화.
- **Grid:** TopBar(48px) + Sidebar(56px) + Main Content. 반응형 시 사이드바 숨김.
- **Max content width:** 제한 없음 (데이터 테이블은 전체 너비 활용)
- **Border radius:** sm: 3px (뱃지, 태그), md: 6px (버튼, 인풋), lg: 8px (카드, 패널), xl: 10px (로고), full: 9999px (아바타)
- **Table:**
  - 행 높이: 36px (compact, 한 화면에 최대한 많은 행)
  - 품목코드 + 품목명: 좌측 고정(sticky)
  - 행 간 구분: 하단 border만 (zebra stripe 대신). 1px solid Border색.
  - 숫자: 우측 정렬, JetBrains Mono, 천 단위 쉼표 필수.
- **Status Badge:** 두꺼운 테두리(1.5px) 정방형 스타일. 결재 도장의 단단한 느낌. border-radius: 3px.

## Motion
- **Approach:** Minimal-functional — 기계적 정밀함. 모든 움직임은 목적이 있어야 함. 바운스 없음.
- **Easing:**
  - Enter: cubic-bezier(0.0, 0.0, 0.2, 1) — 감속 도착
  - Exit: cubic-bezier(0.4, 0.0, 1, 1) — 가속 퇴장
  - Default: cubic-bezier(0.25, 0.1, 0.25, 1) — 자연스럽지만 과하지 않음
  - Spring: 사용하지 않음
- **Duration:**
  - Micro (hover, focus): 80ms
  - Short (tooltip, dropdown): 120ms
  - Medium (패널 전환, 모달): 200ms
  - Long (페이지 전환): 280ms
- **Rules:**
  - 페이지 로드 시 순차 fade-in 금지 (느리고 거슬림)
  - 과도한 skeleton loader 금지 (300ms 이상 걸릴 때만 프로그레스 바)
  - 장식적 파티클/confetti 금지
  - 사이드바 확장: width 200ms + 내부 텍스트 opacity 120ms (80ms 딜레이)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-30 | 디자인 시스템 초기 생성 | /design-consultation 기반. 경쟁 리서치(inFlow, Cin7) + Claude 서브에이전트 디자인 방향 종합. |
| 2026-03-30 | 따뜻한 오프화이트 + 주황 액센트 채택 | 파란/초록 계열 경쟁 SaaS 홍수에서 차별화. "여긴 다른 앱이다" 첫인상. |
| 2026-03-30 | 접힌 사이드바(56px) 기본 | 재고 테이블은 컬럼이 많아 수평 공간 확보가 핵심. |
| 2026-03-30 | JetBrains Mono 숫자 전용 | 재고 시스템에서 숫자 오독은 치명적. 모노스페이스로 정렬 + 구분 명확. |
| 2026-03-30 | 두꺼운 테두리 정방형 상태 뱃지 | pill 배지 대신 결재 도장 느낌의 단단한 뱃지. 한국 사무 문화 반영. |
