# Phase 5 계획 — 완료 카드 관리 + 컬럼 카테고리/정렬

plan.md에는 없던 후속 Phase. `v0.1.0` 태그(Phase 4 완료) 이후 진행.

## 배경

칸반보드를 오래 쓰면 '완료' 컬럼에 카드가 무한히 쌓인다. 하나씩 지우는 것 말고는
정리 수단이 없고, "언제 끝냈는지"도 안 보인다. 컬럼 하나에 성격이 다른 카드가
섞이면 구분도 안 된다.

사용자 요청:
1. 완료 카드의 가시성(언제 완료했는지)
2. 완료 컬럼을 완료한 날짜별로 접을 수 있게
3. '완료' 컬럼을 사용자가 지정 (기본값: 제목이 "완료"인 컬럼)
4. 컬럼 안에 사용자가 만드는 카테고리 칸막이(섹션)
5. 컬럼별 정렬 — 태그 / 마감일 / 생성일 기준
6. 카드 생성일 — 기본은 진짜 생성 시각, 사용자가 임의 수정 가능
7. 태그 자동완성 — 이전에 쓴 태그 추천

정한 것:
- 날짜 그룹 기준 = 완료한 날 (새 필드 `completedAt`)
- 섹션은 컬럼마다 켜서 쓴다. '완료' 컬럼은 섹션 대신 날짜 그룹 고정.
- 완료 카드 "보관(archive)"은 설계 미확정 → 5-6, 이번 범위 밖.

구현 대상: **5-1 ~ 5-5**. 구현 순서: 5-1 → 5-2 → 5-5 → 5-4 → 5-3.

진행: 5-1·5-2·5-4·5-5 = PR #11 머지. **5-3 = 이 브랜치(`feat/phase5-sections`)**.

---

## 5-1. '완료' 컬럼 지정

- `src/types/board.ts`: `Board.doneColumnId?: string`.
- `src/store/boardStore.ts` `migrate`: `doneColumnId` 없으면 `columns.find(c => c.title === "완료")?.id`.
  가리키는 컬럼이 사라졌으면 title로 재해결하거나 clear.
- 액션 `setDoneColumn(columnId: string | null)` — 지정 시 그 컬럼의 `completedAt` 없는
  카드에 `completedAt = now` 소급 기록.
- `ColumnContextMenu`에 "완료 컬럼으로 지정" / "✓ 완료 컬럼 (해제)" 토글 —
  `onSetDone`/`isDone` 정식 prop(위젯 `extraItems` 통로 아님).

## 5-2. '완료' 컬럼 = 완료한 날짜별 접이식 그룹

- `Card.completedAt?: string` (ISO). `moveCard`에서:
  - 목적지 == `doneColumnId` && `!completedAt` → `completedAt = now`
  - 목적지 != `doneColumnId` && `completedAt` → 제거
  - 완료→완료(재배치)는 유지
- `ColumnView`: done 컬럼은 평면 목록 대신 날짜 그룹.
  - `completedAt`(없으면 `createdAt`) 로컬 날짜로 버킷팅, 키 내림차순.
  - 헤더 `▸/▾ 2026-09-08 · N` (오늘/어제는 그 말). 오늘만 기본 펼침, 나머지 접힘.
    접힘 상태는 컴포넌트 로컬 state(영속화 안 함).
  - 그룹 안 카드는 `CardView` 그대로(열기/편집/삭제 O), **정렬 DnD 없음**.
  - done 컬럼은 컬럼 레벨 `useDroppable`만 → 떨구면 `completedAt` 찍힘.
- `src/lib/date.ts`: `toISODate` export, `friendlyDateLabel(iso)` 추가.

## 5-3. 컬럼별 카테고리 섹션 ("칸막이")  — 가장 큼, 마지막

```ts
interface ColumnSection { id: string; title: string; collapsed?: boolean; }
interface Column { /* ... */ sections?: ColumnSection[]; }
interface Card    { /* ... */ sectionId?: string; }  // 없으면 '미분류'
```
`sections` 없거나 빈 배열 → 기존 평면 목록(동작 불변).

- 액션: `addSection(columnId, title): string`, `renameSection`, `removeSection`(섹션만
  삭제, 카드는 `sectionId=undefined`로 남김), `toggleSectionCollapsed`(보드에 저장).
- `moveCard(cardId, toColumnId, toIndex, opts?: { sectionId?: string | null })`:
  `string`→설정, `null`→미분류, 미지정+타컬럼→clear, 미지정+같은컬럼→유지.
- `NewCardInput`에 `sectionId?` 추가.
- `ColumnView` 섹션 렌더: '미분류' 그룹(카드 있을 때만) → `column.sections` 순서대로.
  각 섹션은 `useDroppable({ id: `${columnId}:${sectionId}`, data:{ type:"section", columnId, sectionId }})`.
  그룹 내부는 `SortableContext`로 순서 유지.
- `BoardColumns.tsx` `resolveDropTarget`: `overType==="section"` → `{columnId, sectionId, index}`.
  카드 위 → 그 카드의 `columnId`+`sectionId`, `index = cardIds.indexOf(overId)`.
  드래그 핸들러가 `moveCard(..., { sectionId })` 전달.
- 신규 컴포넌트: `CardGroup.tsx`(접이식 그룹 셸, label을 ReactNode로 확장),
  `ColumnSectionGroup.tsx`(섹션별 droppable + 인라인 이름변경 + ConfirmDialog 삭제).
- `ColumnContextMenu`에 "카테고리 추가"(작은 다이얼로그). done 컬럼에선 숨김.
- **구현됨**: 완료 컬럼은 `column.sections` 무시(날짜 그룹 고정). moveCard가 대상 컬럼에
  없는 섹션 id는 방어적으로 미분류 처리. handleDragOver는 같은 컬럼이라도 섹션이
  바뀌면 실시간 반영, 같은 섹션 순서 변경만 dragEnd로. 정렬 가드는 "같은 컬럼·같은
  섹션"일 때만 무시. 브라우저에서 추가/드래그/이름변경/삭제·미분류복귀·위젯 반영 확인.

## 5-4. 컬럼별 정렬 (태그 / 마감일 / 생성일)

```ts
interface ColumnSort { by: "manual" | "createdAt" | "dueDate" | "label"; dir: "asc" | "desc"; }
interface Column { /* ... */ sort?: ColumnSort; }  // 없으면 manual
```
`sort`는 **뷰 변환** — `cardIds` 재배열 안 함.

- 액션 `setColumnSort(columnId, sort | null)`.
- `src/lib/sortCards.ts` comparator:
  - `createdAt` — ISO 문자열 비교. 기본 `desc`.
  - `dueDate` — 마감일 없는 카드는 dir 무관 항상 뒤. 기본 `asc`(임박 위).
  - `label` — `(labels[0] ?? "").localeCompare`, 태그 없으면 뒤. 기본 `asc`.
  - 동점 tiebreak = `cardIds` 인덱스(안정 정렬).
- `ColumnView`: 각 그룹(평면/섹션/날짜)의 카드 목록에 comparator 적용.
  `sort.by !== "manual"`이면 그룹 내부 정렬 DnD 비활성(타컬럼·섹션 이동은 O).
  헤더에 "정렬: 마감일 ↑" 표시 + "정렬 해제".
- `ColumnContextMenu`에 "정렬" 서브메뉴(`ContextMenuSub`): 수동/생성일/마감일/태그.
  같은 항목 다시 누르면 방향 토글.

## 5-5. 카드 생성일 편집 + 태그 자동완성

둘 다 `src/components/board/CardFields.tsx` + `cardForm.ts`.

- **생성일**: `Card.createdAt`은 이미 존재. `CardPatch`에 `createdAt` 추가,
  `NewCardInput`에 `createdAt?` 추가. `CardFormValue.createdAt: string`(YYYY-MM-DD),
  `cardToForm` = `toISODate(card.createdAt)`, 저장 시 바뀌었으면
  `new Date(v).toISOString()`. `CardFields`에 "생성일" `<input type="date">` 한 줄.
- **태그 자동완성**: `src/lib/labels.ts` `allLabels(board): string[]`(distinct+정렬).
  `CardFields` 라벨 입력에 `<datalist>` 연결(`<input list="card-labels">`). 네이티브, 의존성 0.

## 5-6. 완료 카드 보관함

완료 카드가 쌓이면 삭제 말고 보드 밖으로 치워두되 다시 볼 수 있게.
결정: **수동 + 자동(N일) 둘 다**, **카드 하나씩 + 날짜 그룹 통째 둘 다**,
복원은 **완료 컬럼 맨 아래로**.

**타입** (`src/types/board.ts`):
- `Card.archivedAt?: string` (ISO). `completedAt`은 보관 후에도 유지.
- `Board.archivedCards?: Card[]` (migrate가 없으면 `[]`로).
- `Board.autoArchiveDays?: number` (undefined/0 = 자동 보관 끔).

**스토어** (`src/store/boardStore.ts`):
- `archiveCard(cardId)` / `archiveCards(cardIds: string[])` — 완료 컬럼 카드에 한해,
  `board.cards`·컬럼 `cardIds`에서 빼서 `archivedCards`로. `archivedAt = now`.
- `restoreCard(cardId)` — `archivedCards`에서 빼서 `doneColumnId` 컬럼(없으면 `columns[0]`)
  맨 아래로. `archivedAt` 제거. `completedAt` 유지.
- `deleteArchivedCard(cardId)` — 영구 삭제.
- `setAutoArchiveDays(days: number | null)`.
- `sweepAutoArchive()` — `autoArchiveDays`가 있으면 완료 컬럼에서 `completedAt`이
  N일보다 오래된 카드를 전부 `archiveCards`. `init` 직후 1회 호출 + 보관함 패널에서 수동 실행.
- `migrate`: `archivedCards ??= []`.

**boardIO** (`src/lib/boardIO.ts`): `isBoard()`에 `archivedCards`(있으면 배열) 허용.
내보내기/가져오기가 `archivedCards`·`autoArchiveDays` 왕복.

**UI**:
- `CardContextMenu`에 "보관" 항목 — 완료 컬럼 카드일 때만 (스토어에서 소속 컬럼 확인).
- 완료 컬럼 날짜 그룹 헤더(`CardGroup` `headerExtra`)에 "이 날짜 전체 보관" 버튼
  → `archiveCards(group.cardIds)` (확인 팝업).
- `BoardHeader` `⋯` 메뉴에 "보관함" → `ArchivePanel`(신규, Dialog):
  - `archivedAt` 역순 리스트. 제목/태그 부분일치 검색.
  - 행마다 제목·완료일·태그 + [복원] [영구삭제(`ConfirmDialog`)].
  - 하단: "완료 후 [N]일 지나면 자동 보관" 숫자 입력(0 = 끔) + "지금 정리" 버튼(`sweepAutoArchive`).
- 위젯에서는 보관함 패널 없음 (풀보드 전용). "보관" 액션 자체는 공유 메뉴라 위젯에서도 뜸(무해).

**검증**: 수동 보관 → 카드가 완료에서 사라지고 보관함에 뜸. 날짜 그룹 통째 보관.
복원 → 완료 컬럼 맨 아래, 날짜 그룹 재형성. 영구삭제 확인. 자동 보관: `autoArchiveDays`
설정 후 과거 `completedAt` 카드 심고 새로고침 → 자동으로 보관됨. 내보내기/가져오기 왕복.
창 간 동기화.

---

## 영향 파일

| 파일 | 변경 |
|---|---|
| `src/types/board.ts` | `Board.doneColumnId`, `Card.completedAt`/`sectionId`, `ColumnSection`, `Column.sections`, `ColumnSort`, `Column.sort` |
| `src/store/boardStore.ts` | `migrate`, `moveCard` 시그니처+완료 스탬프+섹션, `setDoneColumn`, `add/rename/removeSection`, `toggleSectionCollapsed`, `setColumnSort`, `NewCardInput`(`sectionId`/`createdAt`), `CardPatch.createdAt` |
| `src/components/board/BoardColumns.tsx` | `resolveDropTarget` 섹션 케이스, 핸들러가 `sectionId` 전달, `doneColumnId` 전달 |
| `src/components/board/ColumnView.tsx` | 3-모드 렌더(평면/섹션/날짜), 섹션 droppable, 그룹별 정렬 |
| `src/components/board/CardGroup.tsx` (신규) | 접이식 그룹 셸 |
| `src/components/board/SectionHeader.tsx` (신규) | 섹션 이름변경/삭제/접기 |
| `src/components/board/ColumnContextMenu.tsx` | "완료 컬럼 지정", "카테고리 추가", "정렬" 서브메뉴 |
| `src/components/board/CardFields.tsx` + `cardForm.ts` | "생성일" 입력, 라벨 `<datalist>` |
| `src/lib/date.ts` | `toISODate` export, `friendlyDateLabel` |
| `src/lib/sortCards.ts` (신규) | 정렬 comparator |
| `src/lib/labels.ts` (신규) | `allLabels(board)` |

위젯은 `BoardColumns` 공유라 자동 반영.

## 검증

- `npx tsc --noEmit` / `npm run lint` / `npm run build`.
- `npm run dev` 풀보드(`/`) + 위젯(`/?view=widget`):
  - 컬럼 제목 바꿔도 지정한 done 컬럼이 날짜 그룹으로. done 드래그 시 오늘 그룹에 생김.
  - devtools로 과거 `completedAt` 심으면 과거 그룹 접힌 채로.
  - 섹션 추가 → 섹션 간/컬럼 간 드래그 → 접기/이름변경/삭제. 삭제 시 카드는 '미분류'로 남음.
  - 정렬: 마감일/생성일/태그순 + 방향 토글, 정렬 중 그룹 내 재배치 막힘, 타컬럼 이동 O.
  - 편집창에서 생성일 변경 → 생성일 정렬에 반영. 라벨 입력 시 기존 태그 자동완성.
- 마이그레이션: Phase 5 이전 보드 JSON → `doneColumnId`가 "완료" 컬럼으로. 내보내기/가져오기 왕복.
- 창 간 동기화(자동저장 → 다른 창 reload) 정상.
