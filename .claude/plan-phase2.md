# Phase 2 계획 — 위젯 모드

plan.md Phase 2 + 사용자 결정(위젯 = 바탕화면 고정, 풀보드 = 일반 창).

## 목표 (plan.md 게이트)

- 축소된 위젯 창 UI: 오늘/임박 마감 + 최근 카드 요약, 빠른 추가 입력
- 위젯 ↔ 풀보드 전환: 트레이 클릭 + 전역 단축키 `Ctrl+Alt+K`
- `tauri-plugin-positioner`로 위젯 창 위치 기억
- **게이트: 한 뷰에서 추가/수정한 카드가 다른 뷰에 즉시 반영**
- (추가) 위젯 창을 바탕화면에 고정 — Windows 전용 스파이크

## 확정/제안 결정

### A. 창 구조 — 별도 창 2개 (제안)

- `main` 창: 풀보드 모드, 일반 창 (지금 그대로). 시작 시 숨김.
- `widget` 창: 위젯 모드, 프레임 없음·투명·작음·바탕화면 고정. 시작 시 표시.
- 이유: 두 모드는 창 속성(장식/투명/z-order)이 정반대라, 한 창을 런타임에
  재구성하는 것보다 창 2개가 단순하고 안정적이다.
- 각 창은 같은 프론트 번들을 로드하되 쿼리(`?view=widget`)나 창 label로
  분기해 `BoardView` 또는 `WidgetView`를 렌더한다.

### B. 데이터 동기화 — 저장 후 Tauri 이벤트 브로드캐스트

- 창마다 별도 JS 컨텍스트 → 별도 Zustand 스토어. 둘 다 같은 `board.json` 사용.
- `saveBoard` 직후 `emit("board:updated")`. 다른 창이 수신하면 `loadBoard()`로
  스토어 교체(짧은 디바운스). 자기 자신이 낸 이벤트는 무시.
- 이걸로 게이트("즉시 반영")를 만족.

### C. "최근 카드" 위해 `Card`에 `createdAt` 추가

- 현재 생성 시각 정보가 없다. `createdAt: string`(ISO) 필드 추가.
  기존 저장 데이터엔 없으므로 로드 시 없으면 채워 넣는 마이그레이션 1줄.
- 위젯 요약: (1) 마감일이 오늘이거나 지난 카드, (2) 최근 생성 N개.

### D. 위젯 빠른 추가 대상 = 첫 번째 컬럼

- 위젯 입력창에서 추가한 카드는 `board.columns[0]`(보통 "할 일") 끝에 생성.
- 나중에 설정으로 대상 컬럼 지정 가능하게(Phase 3 설정 창).

### E. 전환 동작

- 앱 시작: `widget` 표시(바탕화면 고정), `main` 숨김.
- 트레이 좌클릭 / `Ctrl+Alt+K`: `main` 창 토글(숨김이면 표시·포커스, 보이면 숨김).
  `widget`은 항상 떠 있음.
- 트레이 우클릭 메뉴: "풀보드 열기/닫기", "위젯 표시/숨김", "종료".
- 전역 단축키는 `tauri-plugin-global-shortcut` 필요.

### F. 바탕화면 고정 방식 — 가벼운 방식(B)부터

- **방식 B (우선 시도)**: `widget` 창에 `WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW`,
  `skipTaskbar`, `SetWindowPos(HWND_BOTTOM)`. 포커스/활성화 시 다시 맨 아래로
  가라앉힘. "벽지의 자식"은 아니지만 항상 바닥에 깔림.
  - 난점: `WS_EX_NOACTIVATE` 창은 기본적으로 키 입력 포커스를 못 받음 →
    위젯 빠른 추가 입력이 문제. 클릭 시 잠깐 활성화 허용 후 blur에서 다시
    가라앉히는 절충 필요.
- **방식 A (B가 부족하면)**: `Progman`에 `0x052C` → `WorkerW` 탐색 →
  `SetParent`. 더 "벽지에 붙은" 느낌이지만 탐색기 재시작/멀티모니터/Win+D
  엣지케이스가 많다.
- 커스텀 Rust + `windows` 크레이트 필요. tech-stack.md의 "Rust 이슈 반복 시
  Electron" 조건에 해당하는 부분 — 많이 막히면 재검토.

## 진행 순서 (제안: 스파이크를 마지막에)

1. `feat/phase2-widget` 브랜치. `Card.createdAt` 추가 + 마이그레이션.
2. 창 구조: `widget` 창을 tauri.conf에 추가(일단 일반 작은 창), 프론트 뷰 분기.
3. `WidgetView` UI: 마감 임박/오늘 + 최근 카드 목록 + 빠른 추가 입력.
4. 데이터 동기화: `saveBoard` 후 이벤트 emit, 양쪽 창이 수신해 리로드. **게이트 확인.**
5. 전환: 트레이 메뉴/좌클릭 정리 + `tauri-plugin-global-shortcut`로 `Ctrl+Alt+K`.
6. `tauri-plugin-positioner`로 위젯 위치 기억.
7. **바탕화면 고정 스파이크(방식 B)** — 별도 커밋. 되면 유지, 많이 막히면
   범위/대안 재논의.

## 새 의존성 (예정)

- `tauri-plugin-positioner` (+ `@tauri-apps/plugin-positioner`)
- `tauri-plugin-global-shortcut` (+ `@tauri-apps/plugin-global-shortcut`)
- `windows` (Rust, 스파이크 단계)

## 확정 (사용자 확인 2026-09-07)

- 창 구조: **별도 창 2개** (main=풀보드 일반창, widget=위젯 바탕화면 고정).
- 진행 순서: 바탕화면 고정 스파이크는 **마지막**. 나머지로 Phase 2 게이트 먼저 통과.
