import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { loadBoard, saveBoard } from "@/lib/boardStorage";
import type { Board, Card, Column } from "@/types";

// 카드 생성 시 넘길 수 있는 초기 필드. 빠른 추가는 title(+dueDate)만, 상세 추가는 전부 채운다.
export type NewCardInput = Partial<
  Pick<Card, "description" | "dueDate" | "labels" | "checklist">
> & {
  title: string;
};

// 앱을 처음 실행할 때 만들어 두는 기본 컬럼.
const DEFAULT_COLUMN_TITLES = ["할 일", "진행 중", "완료"];
const DEFAULT_BOARD_TITLE = "내 보드";
// 변경이 잦을 때 디스크 쓰기를 묶기 위한 자동 저장 지연.
const AUTOSAVE_DELAY_MS = 300;

function createId(): string {
  return crypto.randomUUID();
}

function createDefaultBoard(): Board {
  const columns: Column[] = DEFAULT_COLUMN_TITLES.map((title) => ({
    id: createId(),
    title,
    cardIds: [],
  }));
  return { id: createId(), title: DEFAULT_BOARD_TITLE, columns, cards: {}, };
}

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

type CardPatch = Partial<Pick<Card, "title" | "description" | "dueDate" | "labels" | "checklist">>;

interface BoardState {
  board: Board | null;
  isLoaded: boolean;

  // 저장된 보드를 불러오고, 없으면 기본 보드를 만든다. 앱 시작 시 한 번 호출.
  init: () => Promise<void>;

  addColumn: (title: string) => void;
  renameColumn: (columnId: string, title: string) => void;
  removeColumn: (columnId: string) => void;

  // 새 카드를 만들고 그 id를 반환한다.
  addCard: (columnId: string, input: NewCardInput) => string;
  updateCard: (cardId: string, patch: CardPatch) => void;
  removeCard: (cardId: string) => void;
  // 카드를 toColumnId의 toIndex 위치로 옮긴다. 같은 컬럼 내 순서 변경도 이 함수로 처리.
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;

  addChecklistItem: (cardId: string, text: string) => void;
  toggleChecklistItem: (cardId: string, itemId: string) => void;
  removeChecklistItem: (cardId: string, itemId: string) => void;
}

export const useBoardStore = create<BoardState>()(
  immer((set) => ({
    board: null,
    isLoaded: false,

    init: async () => {
      const saved = await loadBoard();
      set((state) => {
        state.board = saved ?? createDefaultBoard();
        state.isLoaded = true;
      });
    },

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
          order: column.cardIds.length,
        };
        column.cardIds.push(id);
      });
      return id;
    },

    updateCard: (cardId, patch) =>
      set((state) => {
        const card = state.board?.cards[cardId];
        if (card) Object.assign(card, patch);
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

    moveCard: (cardId, toColumnId, toIndex) =>
      set((state) => {
        if (!state.board) return;
        const fromColumn = state.board.columns.find((c) =>
          c.cardIds.includes(cardId),
        );
        const toColumn = state.board.columns.find((c) => c.id === toColumnId);
        if (!fromColumn || !toColumn) return;

        fromColumn.cardIds = fromColumn.cardIds.filter((id) => id !== cardId);
        const clampedIndex = Math.max(0, Math.min(toIndex, toColumn.cardIds.length));
        toColumn.cardIds.splice(clampedIndex, 0, cardId);

        renumber(state.board, fromColumn.id);
        if (fromColumn.id !== toColumn.id) renumber(state.board, toColumn.id);
      }),

    addChecklistItem: (cardId, text) =>
      set((state) => {
        const card = state.board?.cards[cardId];
        if (card) card.checklist.push({ id: createId(), text, done: false });
      }),

    toggleChecklistItem: (cardId, itemId) =>
      set((state) => {
        const item = state.board?.cards[cardId]?.checklist.find(
          (i) => i.id === itemId,
        );
        if (item) item.done = !item.done;
      }),

    removeChecklistItem: (cardId, itemId) =>
      set((state) => {
        const card = state.board?.cards[cardId];
        if (card) card.checklist = card.checklist.filter((i) => i.id !== itemId);
      }),
  })),
);

// 보드가 바뀔 때마다 디스크에 자동 저장한다. 짧은 시간의 연속 변경은 묶는다.
let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
useBoardStore.subscribe((state, prev) => {
  if (!state.board || state.board === prev.board) return;
  const snapshot = state.board;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    void saveBoard(snapshot);
  }, AUTOSAVE_DELAY_MS);
});
