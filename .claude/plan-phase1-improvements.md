# Phase 1 개선 계획

풀보드 모드(Phase 1) 게이트 통과 후 사용자가 요청한 개선 5건.

- **개선 1~4**: 풀보드 모드 UX 폴리싱. `feat/phase1-improvements` 브랜치에서 처리.
- **개선 5**: 창 배치 방식 변경(always-on-top → "위젯 모드만 바탕화면 고정").
  일부는 지금(풀보드를 일반 창으로), 본체는 Phase 2에서 구현. **plan.md Phase 2의
  "위젯 모드" 정의를 수정**해야 한다("always-on-top 작은 창" → "바탕화면 고정 작은 창").

## 진행 방식

- **브랜치**: `feat/phase1-board`는 게이트를 통과했으므로 그대로 PR → `main` 머지하고,
  개선 작업은 새 브랜치 `feat/phase1-improvements`에서 진행한다. (히스토리·리뷰 분리)
- 각 개선은 독립 커밋. 커밋 접두사 `feat: [Phase1-개선] ...` / `refactor: ...`.
- 매 커밋 전 `npm run lint`, `npm run build`, 그리고 Rust 변화 시 `cargo check`.

## 확정된 결정 (사용자 확인)

- **좁은 창 레이아웃**: 컬럼 자동 축소. 컬럼이 남은 너비를 나눠 갖고 최소 너비
  아래로만 가로 스크롤.
- **상세 카드 추가 진입점**: 각 컬럼 하단, 빠른 추가 입력창 옆의 작은 "상세" 버튼.
- **창 배치**: 위젯 모드만 바탕화면 고정(데스크톱 위젯), 풀보드 모드는 일반 창.
  always-on-top은 사용하지 않는다.
- **카드 편집 다이얼로그**: 생성·편집 모두 draft + "저장 / 취소" 방식으로 통일
  (blur 자동 저장 폐기).
- **헤더 메뉴 아이콘**: `⋯`.
- **브랜치 전략**: `feat/phase1-board`(현재 6커밋, 게이트 통과)를 먼저 PR→머지해
  검증된 베이스라인을 `main`에 고정한 뒤, 개선은 새 브랜치 `feat/phase1-improvements`
  에서 진행. Phase 1을 되돌리지 않는다(사유는 문서 끝 "되돌리기 대신 점진 개선" 참고).

---

## 개선 1 — 카드 생성 시 모든 필드 설정 (상세 추가)

### 현재

카드 추가 = 제목만. 마감일/설명/라벨/체크리스트는 카드를 만든 뒤 다시 클릭해
상세 패널에서만 편집 가능.

### 목표

컬럼마다 "상세" 버튼 → 빈 카드 편집 다이얼로그 → 제목·설명·마감일·라벨·체크리스트를
다 채운 뒤 "추가"하면 그 컬럼에 카드가 생성된다.

### 구현

1. **폼 UI 분리** — 현재 `CardDetailDialog` 안의 필드 묶음(제목/설명/마감일/라벨/
   체크리스트)을 프레젠테이션 컴포넌트 `CardFields`로 추출한다.
   - 입력: `value: CardDraft`, `onChange: (patch: Partial<CardDraft>) => void`
   - `CardDraft = { title; description; dueDate?; labels: string[]; checklist: ChecklistItem[] }`
   - 체크리스트 add/toggle/remove도 `onChange`로 로컬 배열을 갱신 (스토어 직접 호출 X)
2. **생성 다이얼로그** `CardCreateDialog`
   - `columnId: string | null`, `onClose`
   - `useState<CardDraft>`로 빈 초안 보유, `<CardFields>` 렌더
   - "추가" → `addCard(columnId, draft)` 호출 후 닫기. 제목이 비면 비활성화
3. **상세 편집 다이얼로그도 draft + 저장/취소로 통일** (선택이지만 권장)
   - 현재는 blur마다 스토어를 건드림 → 초안을 잡고 "저장"에서 한 번에 반영,
     "취소"로 폐기. `CardFields`를 공유하게 되어 코드가 하나로 정리됨.
   - 리스크: 편집 UX가 자동저장 → 명시적 저장으로 바뀜. 이 문서 승인 시 함께 적용.
4. **컬럼 UI**: `ColumnView`에 "상세" 버튼 추가, `onOpenCreate(columnId)` 콜백.
   `BoardView`가 `createColumnId` 상태 보유하고 `<CardCreateDialog>` 렌더.

### 스토어 변경

- `addCard(columnId, title)` → `addCard(columnId, input: NewCardInput)` 로 확장.
  `NewCardInput = { title: string; description?: string; dueDate?: string;
  labels?: string[]; checklist?: ChecklistItem[] }`
- 새 카드 id를 반환(향후 위젯/후속 흐름에서 재사용).
- 기존 호출부(빠른 추가)는 `addCard(colId, { title })`로 수정.

---

## 개선 2 — 빠른 추가 (제목 + 마감일)

### 목표

컬럼 하단의 기존 "카드 추가"를 가벼운 "빠른 추가"로. 제목 + (선택) 마감일만
입력하면 바로 저장.

### 구현

- `ColumnView`의 빠른 추가 폼: 제목 `Input` + 작은 `Input type="date"` + "추가" 버튼
- 제목에서 Enter → 현재 날짜값과 함께 `addCard(columnId, { title, dueDate })`
- 저장 후 두 입력 모두 초기화
- 마감일은 비워도 됨(그때는 `dueDate` 생략)

### 비고

이 "빠른 추가" + 확장된 `addCard`는 Phase 2 위젯의 "빠른 카드 추가"에서 그대로 재사용된다.

---

## 개선 3 — 좁은 창에서 컬럼 자동 축소

### 현재

`ColumnView`가 고정 `w-72 shrink-0`, 보드 컨테이너가 `overflow-x-auto` →
창이 좁으면 항상 가로 스크롤.

### 목표

컬럼들이 남은 가로 공간을 나눠 갖고, 최소 너비 밑으로 좁아질 때만 가로 스크롤.

### 구현

- 컬럼: `w-72 shrink-0` → `flex-1 min-w-[260px] max-w-[340px]`
  (`max-w`로 컬럼 2~3개일 때 과도하게 넓어지는 것 방지)
- 보드 컨테이너: `flex gap-3` 유지, `overflow-x-auto`는 최소 너비 초과 시 폴백으로만 남김
- 세로 높이는 그대로(각 컬럼 카드 리스트가 세로 스크롤)
- 확인: 컬럼 5~6개 + 창 축소 시 스크롤, 컬럼 3개 + 넓은 창에서 스크롤 없음

---

## 개선 4 — 컬럼 추가를 보드 헤더 메뉴로

### 현재

컬럼들 오른쪽에 점선 테두리 "+ 컬럼 추가" 입력 폼이 컬럼 한 칸만큼 자리 차지.

### 목표

그 폼을 제거하고, 보드 헤더의 메뉴에서 컬럼을 추가.

### 구현

- 보드 헤더(`내 보드` 제목 줄) 오른쪽에 아이콘 버튼(⋯) → 드롭다운 메뉴
  - `@radix-ui/react-dropdown-menu` 기반 `DropdownMenu` 컴포넌트 추가 (shadcn 스타일)
  - 항목: "컬럼 추가" → 이름 입력용 작은 다이얼로그(입력 1개) → `addColumn(title)`
  - 이 메뉴는 이후 Phase 3의 JSON 내보내기/가져오기, 자동 시작 옵션 등이 붙는 자리
- 인라인 "+ 컬럼 추가" 폼 및 관련 상태(`newColumnTitle`) 제거
- (범위 밖) 전체 설정 창은 Phase 3에서. 지금은 드롭다운 메뉴로 충분.

### 새 의존성

- `@radix-ui/react-dropdown-menu` (shadcn dropdown-menu 표준 기반)

---

---

## 개선 5 — 창 배치: always-on-top 제거, 위젯 모드는 바탕화면 고정

### 배경

사용자가 원하는 형태는 Rainmeter 데스크톱 위젯처럼 **바탕화면에 붙박이로 고정**된
창(다른 앱 창 아래, 작업표시줄·Alt+Tab 목록에 안 뜸, 벽지의 일부처럼 보임)이다.
현재의 always-on-top(모든 창 위)과는 정반대다.

### 확정 범위

- **위젯 모드(Phase 2)**: 바탕화면 고정.
- **풀보드 모드**: 일반 창. always-on-top 안 씀.

### 지금 할 것 (`feat/phase1-improvements`)

- `src-tauri/tauri.conf.json` 메인 창에서 `"alwaysOnTop": true` 제거.
  → 풀보드가 평범한 창이 된다. (트레이 토글 동작은 그대로 유지)
- 커밋: `feat: [Phase1-개선] 풀보드 창의 always-on-top 제거`

### Phase 2에서 할 것 (이 브랜치 범위 밖, 별도 스파이크)

- 바탕화면 고정 위젯 창 구현 — Windows 전용 Win32 작업이라 커스텀 Rust 필요:
  - 방식 A (Rainmeter식): `Progman`에 `0x052C` 메시지 → 벽지 호스트 `WorkerW`
    핸들 탐색 → `SetParent(widgetHwnd, workerW)`.
  - 방식 B (단순): `WS_EX_NOACTIVATE` + `SetWindowPos(HWND_BOTTOM)` +
    `skipTaskbar` + 포커스 시 다시 맨 아래로. 벽지에 "부모"로 붙지는 않지만
    항상 바닥에 깔림.
  - Tauri 창 옵션: `decorations:false`, `transparent:true`, `skipTaskbar:true`,
    `shadow:false`, `resizable:false`(초안).
  - 주의: 다중 모니터, "바탕화면 보기"(Win+D), 탐색기 재시작 시 `WorkerW`
    재생성, DPI 스케일, 위젯↔풀보드 전환 시 창 재설정.
- plan.md Phase 2 항목의 "always-on-top" 문구를 "바탕화면 고정"으로 수정.
- 위젯↔풀보드는 별도 창 2개로 갈지(위젯=고정 창, 풀보드=일반 창), 한 창의
  모드 전환으로 갈지 Phase 2 착수 시 결정. (창 2개가 배치 방식이 정반대라 더 단순할 듯)

---

## 커밋 순서(안) — `feat/phase1-improvements`

1. `feat: [Phase1-개선] 풀보드 창의 always-on-top 제거` (개선 5 일부, 1줄)
2. `refactor: store addCard가 초기 필드 객체를 받도록 확장` (개선 1·2 공통 토대)
3. `feat: [Phase1-개선] 좁은 창에서 컬럼 자동 축소` (개선 3)
4. `feat: [Phase1-개선] 컬럼 추가를 보드 헤더 메뉴로 이동` (개선 4)
5. `feat: [Phase1-개선] 빠른 추가에 마감일 입력 추가` (개선 2)
6. `refactor: 카드 필드 폼을 CardFields로 추출` (개선 1 토대, 상세 편집 다이얼로그도 통일)
7. `feat: [Phase1-개선] 컬럼별 상세 카드 추가 다이얼로그` (개선 1)

## 되돌리기 대신 점진 개선 (브랜치 전략 근거)

"Phase 1을 되돌리고 다시 만드는 게 안정적이지 않을까?"에 대한 답:

- Phase 1의 코어(타입, Zustand 스토어, tauri-plugin-store 영속화, @dnd-kit,
  보드 렌더링)는 게이트로 검증됐고 이번 개선에서 **바뀌지 않는다**.
- 개선이 건드리는 범위는 국소적이다:
  - `addCard` 시그니처(작은 refactor)
  - 카드 다이얼로그: `CardFields` 추출 + draft 방식 통일(중간 규모 refactor)
  - `ColumnView`: 빠른 추가에 날짜 필드, "상세" 버튼(작음)
  - `BoardView`: 레이아웃 클래스, 인라인 컬럼 추가 제거 + 헤더 메뉴(작음~중간)
  - `tauri.conf.json`: `alwaysOnTop` 제거(1줄)
- 되돌리고 재작성 = 검증된 6커밋을 버리고 같은 구조를 다시 짜는 것 → 위험이 더 큼.
- 안전장치는 이미 git이다: 각 개선이 독립 커밋이라 문제 생기면 그 커밋만 되돌린다.
- 특정 파일 diff가 지저분해지면 그 커밋에서 **파일 전체를 새로 쓴다**(= 그 파일만
  재작성). 이는 Phase 전체를 되돌리는 것과 다르다.

결론: `feat/phase1-board` 먼저 머지 → `feat/phase1-improvements`에서 개선.
`CardFields` 추출·다이얼로그 통일은 전용 `refactor:` 커밋으로 깔끔하게.
