import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { loadBoard, saveBoard } from "@/lib/boardStorage";
import { notifyBoardChanged, subscribeBoardChanges } from "@/lib/boardSync";
import { createId } from "@/lib/id";
import type { Board, Card, Column } from "@/types";

// 카드 생성 시 넘길 수 있는 초기 필드. 빠른 추가는 title(+dueDate)만, 상세 추가는 전부 채운다.
export type NewCardInput = Partial<
  Pick<Card, "description" | "dueDate" | "labels" | "checklist" | "color">
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

type CardPatch = Partial<Pick<Card, "title" | "description" | "dueDate" | "labels" | "checklist" | "color">>;

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

  // 새 카드를 만들고 그 id를 반환한다.
  addCard: (columnId: string, input: NewCardInput) => string;
  updateCard: (cardId: string, patch: CardPatch) => void;
  removeCard: (cardId: string) => void;
  // 카드를 toColumnId의 toIndex 위치로 옮긴다. 같은 컬럼 내 순서 변경도 이 함수로 처리.
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
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
          color: input.color || undefined,
          order: column.cardIds.length,
          createdAt: new Date().toISOString(),
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
