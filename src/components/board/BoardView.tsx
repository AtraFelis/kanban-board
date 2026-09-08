import { useEffect, useState } from "react";

import { useBoardStore } from "@/store/boardStore";

import { BoardColumns } from "./BoardColumns";
import { BoardHeader } from "./BoardHeader";
import { CardCreateDialog } from "./CardCreateDialog";
import { CardDetailDialog } from "./CardDetailDialog";

// 풀보드 모드 최상위. 스토어를 초기화하고 컬럼 그리드를 렌더한다.
export function BoardView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  if (!isLoaded || !board) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col gap-3 p-3 select-none">
      <BoardHeader title={board.title} />

      <BoardColumns
        board={board}
        onOpenCard={setOpenCardId}
        onOpenCreate={setCreateColumnId}
        quickAdd
      />

      <CardDetailDialog
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
      <CardCreateDialog
        columnId={createColumnId}
        onClose={() => setCreateColumnId(null)}
      />
    </div>
  );
}
