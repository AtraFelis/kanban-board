import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { loadBoard, saveBoard } from "@/lib/boardStorage";
import { notifyBoardChanged, subscribeBoardChanges } from "@/lib/boardSync";
import { createId } from "@/lib/id";
import type { Board, Card, Column, ColumnSort } from "@/types";

// 카드 생성 시 넘길 수 있는 초기 필드. 빠른 추가는 title(+dueDate)만, 상세 추가는 전부 채운다.
export type NewCardInput = Partial<
  Pick<
    Card,
    | "description"
    | "dueDate"
    | "labels"
    | "checklist"
    | "color"
    | "createdAt"
    | "sectionId"
  >
> & {
  title: string;
};

// 앱을 처음 실행할 때 만들어 두는 기본 컬럼.
const DEFAULT_COLUMN_TITLES = ["할 일", "진행 중", "완료"];
const DEFAULT_BOARD_TITLE = "내 보드";
// 변경이 잦을 때 디스크 쓰기를 묶기 위한 자동 저장 지연.
const AUTOSAVE_DELAY_MS = 300;

function createDefaultBoard(): Board {
  const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title) => ({
    id: createId(),
    title,
    cardIds: [],
  }));
  return { id: createId(), title: DEFAULT_BOARD_TITLE, columns, cards: {}, };
}

// 오래된 저장 데이터를 현재 스키마에 맞게 보정한다 (draft를 직접 수정).
function migrate(board: Board): void {
  const now = new Date().toISOString();
  for (const card of Object.values(board.cards)) {
    if (!card.createdAt) card.createdAt = now;
  }
  // '완료' 컬럼: 지정이 없거나 가리키던 컬럼이 사라졌으면 제목으로 재해결한다.
  const doneExists =
    !!board.doneColumnId &&
    board.columns.some((c) => c.id === board.doneColumnId);
  if (!doneExists) {
    board.doneColumnId = board.columns.find((c) => c.title === "완료")?.id;
  }
}

// reload()가 자동 저장을 다시 유발해 창끼리 무한 루프가 도는 것을 막는 플래그.
let isApplyingRemote = false;

// 특정 컬럼의 cardIds 순서에 맞춰 각 카드의 order를 다시 매긴다.
// cardIds가 순서의 원본이고 order는 보조 필드다.
function renumber(board: Board, columnId: string): void {
  const column = board.columns.find((c) => c.id === columnId);
  if (!column) return;
  column.cardIds.forEach((cardId, index) => {
    const card = board.cards[cardId];
    if (card) card.order = index;
  });
}

// updateCard에 넘길 수 있는 부분 갱신. 값이 undefined면 그 필드를 제거한다.
export type CardPatch = Partial<
  Pick<
    Card,
    | "title"
    | "description"
    | "dueDate"
    | "labels"
    | "checklist"
    | "color"
    | "createdAt"
    | "completedAt"
  >
>;

interface BoardState {
  board: Board | null;
  isLoaded: boolean;

  // 저장된 보드를 불러오고, 없으면 기본 보드를 만든다. 앱 시작 시 한 번 호출.
  init: () => Promise<void>;
  // 다른 창의 변경을 반영하기 위해 디스크에서 다시 읽는다. (자동 저장을 유발하지 않음)
  reload: () => Promise<void>;
  // 가져오기 등으로 보드 전체를 교체한다. (자동 저장·다른 창 알림은 그대로 발생)
  replaceBoard: (board: Board) => void;

  addColumn: (title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  removeColumn: (columnId: string) => void;
  // '완료'로 취급할 컬럼을 지정/해제한다. 지정 시 그 컬럼의 카드에 완료 시각을 소급한다.
  setDoneColumn: (columnId: string | null) => void;
  // 컬럼의 정렬 방식을 설정한다 (null이면 manual로 되돌림). 화면 표시만 바뀐다.
  setColumnSort: (columnId: string, sort: ColumnSort | null) => void;

  // 컬럼 카테고리 섹션. addSection은 만든 섹션 id를 반환한다.
  addSection: (columnId: string, title: string) => string;
  renameSection: (columnId: string, sectionId: string, title: string) => void;
  // 섹션만 제거하고, 그 섹션의 카드는 '미분류'로 남긴다 (카드는 삭제하지 않음).
  removeSection: (columnId: string, sectionId: string) => void;
  toggleSectionCollapsed: (columnId: string, sectionId: string) => void;

  // 새 카드를 만들고 그 id를 반환한다.
  addCard: (columnId: string, input: NewCardInput) => string;
  updateCard: (cardId: string, patch: CardPatch) => void;
  removeCard: (cardId: string) => void;
  // 카드를 toColumnId의 toIndex 위치로 옮긴다. 같은 컬럼 내 순서 변경도 이 함수로 처리.
  // opts.sectionId: string → 그 섹션으로, null → 미분류로. 생략 시 같은 컬럼이면 유지,
  // 다른 컬럼이면 미분류로 초기화한다.
  // opts.skipCompletion: 드래그 중 미리보기 이동처럼, 완료 컬럼 진입/이탈에 따른
  // completedAt 자동 갱신을 하지 않는다.
  moveCard: (
    cardId: string,
    toColumnId: string,
    toIndex: number,
    opts?: { sectionId?: string | null; skipCompletion?: boolean },
  ) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set) => ({
    board: null,
    isLoaded: false,

    init: async () => {
      const saved = await loadBoard();
      set((state) => {
        const board = saved ?? createDefaultBoard();
        migrate(board);
        state.board = board;
        state.isLoaded = true;
      });
    },

    reload: async () => {
      const saved = await loadBoard();
      if (!saved) return;
      isApplyingRemote = true;
      set((state) => {
        migrate(saved);
        state.board = saved;
      });
      isApplyingRemote = false;
    },

    replaceBoard: (board) =>
      set((state) => {
        migrate(board);
        state.board = board;
      }),

    addColumn: (title) =>
      set((state) => {
        if (!state.board) return;
        state.board.columns.push({ id: createId(), title, cardIds: [] });
      }),

    renameColumn: (columnId, title) =>
      set((state) => {
        const column = state.board?.columns.find((c) => c.id === columnId);
        if (column) column.title = title;
      }),

    removeColumn: (columnId) =>
      set((state) => {
        if (!state.board) return;
        const column = state.board.columns.find((c) => c.id === columnId);
        if (!column) return;
        // 컬럼에 속한 카드도 함께 제거한다.
        for (const cardId of column.cardIds) delete state.board.cards[cardId];
        state.board.columns = state.board.columns.filter((c) => c.id !== columnId);
        if (state.board.doneColumnId === columnId) {
          state.board.doneColumnId = undefined;
        }
      }),

    setDoneColumn: (columnId) =>
      set((state) => {
        if (!state.board) return;
        state.board.doneColumnId = columnId ?? undefined;
        if (!columnId) return;
        // 이미 그 컬럼에 있는 카드에 완료 시각을 소급 기록해 날짜 그룹에 들어가게 한다.
        const column = state.board.columns.find((c) => c.id === columnId);
        const now = new Date().toISOString();
        for (const cardId of column?.cardIds ?? []) {
          const card = state.board.cards[cardId];
          if (card && !card.completedAt) card.completedAt = now;
        }
      }),

    setColumnSort: (columnId, sort) =>
      set((state) => {
        const column = state.board?.columns.find((c) => c.id === columnId);
        if (column) column.sort = sort ?? undefined;
      }),

    addSection: (columnId, title) => {
      const id = createId();
      set((state) => {
        const column = state.board?.columns.find((c) => c.id === columnId);
        if (!column) return;
        if (!column.sections) column.sections = [];
        column.sections.push({ id, title });
      });
      return id;
    },

    renameSection: (columnId, sectionId, title) =>
      set((state) => {
        const section = state.board?.columns
          .find((c) => c.id === columnId)
          ?.sections?.find((s) => s.id === sectionId);
        if (section) section.title = title;
      }),

    removeSection: (columnId, sectionId) =>
      set((state) => {
        const board = state.board;
        const column = board?.columns.find((c) => c.id === columnId);
        if (!board || !column?.sections) return;
        column.sections = column.sections.filter((s) => s.id !== sectionId);
        for (const cardId of column.cardIds) {
          const card = board.cards[cardId];
          if (card?.sectionId === sectionId) delete card.sectionId;
        }
      }),

    toggleSectionCollapsed: (columnId, sectionId) =>
      set((state) => {
        const section = state.board?.columns
          .find((c) => c.id === columnId)
          ?.sections?.find((s) => s.id === sectionId);
        if (section) section.collapsed = !section.collapsed;
      }),

    addCard: (columnId, input) => {
      const id = createId();
      set((state) => {
        if (!state.board) return;
        const column = state.board.columns.find((c) => c.id === columnId);
        if (!column) return;
        state.board.cards[id] = {
          id,
          title: input.title,
          description: input.description || undefined,
          dueDate: input.dueDate || undefined,
          labels: input.labels ?? [],
          checklist: input.checklist ?? [],
          sectionId: input.sectionId || undefined,
          color: input.color || undefined,
          order: column.cardIds.length,
          createdAt: input.createdAt || new Date().toISOString(),
        };
        column.cardIds.push(id);
      });
      return id;
    },

    updateCard: (cardId, patch) =>
      set((state) => {
        const card = state.board?.cards[cardId];
        if (!card) return;
        for (const [key, val] of Object.entries(patch)) {
          if (val === undefined) {
            delete (card as Record<string, unknown>)[key];
          } else {
            (card as Record<string, unknown>)[key] = val;
          }
        }
      }),

    removeCard: (cardId) =>
      set((state) => {
        if (!state.board) return;
        delete state.board.cards[cardId];
        for (const column of state.board.columns) {
          const index = column.cardIds.indexOf(cardId);
          if (index !== -1) {
            column.cardIds.splice(index, 1);
            renumber(state.board, column.id);
            break;
          }
        }
      }),

    moveCard: (cardId, toColumnId, toIndex, opts) =>
      set((state) => {
        if (!state.board) return;
        const fromColumn = state.board.columns.find((c) =>
          c.cardIds.includes(cardId),
        );
        const toColumn = state.board.columns.find((c) => c.id === toColumnId);
        if (!fromColumn || !toColumn) return;
        const sameColumn = fromColumn.id === toColumn.id;

        fromColumn.cardIds = fromColumn.cardIds.filter((id) => id !== cardId);
        const clampedIndex = Math.max(0, Math.min(toIndex, toColumn.cardIds.length));
        toColumn.cardIds.splice(clampedIndex, 0, cardId);

        renumber(state.board, fromColumn.id);
        if (!sameColumn) renumber(state.board, toColumn.id);

        const card = state.board.cards[cardId];
        if (card) {
          // 섹션 배정: 명시되면 그대로, 생략되면 컬럼이 바뀔 때만 미분류로.
          if (opts && opts.sectionId !== undefined) {
            if (opts.sectionId === null) delete card.sectionId;
            else card.sectionId = opts.sectionId;
          } else if (!sameColumn) {
            delete card.sectionId;
          }
          // 대상 컬럼에 그 섹션이 없으면 미분류 처리 (방어).
          if (
            card.sectionId &&
            !toColumn.sections?.some((s) => s.id === card.sectionId)
          ) {
            delete card.sectionId;
          }

          // '완료' 컬럼에 들어오면 완료 시각을 찍고, 밖으로 나가면 지운다.
          // (드래그 미리보기 이동에서는 skipCompletion으로 건너뛴다.)
          if (!opts?.skipCompletion) {
            const doneId = state.board.doneColumnId;
            if (doneId && toColumn.id === doneId) {
              if (!card.completedAt) card.completedAt = new Date().toISOString();
            } else if (card.completedAt) {
              delete card.completedAt;
            }
          }
        }
      }),
  })),
);

// 보드가 바뀔 때마다 디스크에 자동 저장하고, 다른 창에 알린다.
// 짧은 시간의 연속 변경은 묶고, reload()로 인한 변경은 저장하지 않는다.
let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
useBoardStore.subscribe((state, prev) => {
  if (isApplyingRemote) return;
  if (!state.board || state.board === prev.board) return;
  const snapshot = state.board;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    void saveBoard(snapshot).then(() => notifyBoardChanged());
  }, AUTOSAVE_DELAY_MS);
});

// 다른 창이 저장하면 디스크에서 다시 읽는다.
subscribeBoardChanges(() => {
  void useBoardStore.getState().reload();
});
