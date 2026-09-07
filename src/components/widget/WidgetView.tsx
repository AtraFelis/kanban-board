import { useEffect, useState } from "react";
import { Window } from "@tauri-apps/api/window";

import { CardContextMenu } from "@/components/board/CardContextMenu";
import { CardDetailDialog } from "@/components/board/CardDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISODate } from "@/lib/date";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Column } from "@/types";

// 풀보드 창을 띄운다 (숨겨져 있으면 표시 + 포커스).
async function openFullBoard() {
  try {
    const main = await Window.getByLabel("main");
    await main?.show();
    await main?.setFocus();
  } catch {
    // Tauri 런타임이 아니면 무시
  }
}

// 바탕화면에 상주하는 작은 보드. 컬럼을 그리드로 배치하고, 카드 우클릭으로
// 수정/이동/삭제, 하단에서 빠른 추가.
export function WidgetView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const addCard = useBoardStore((s) => s.addCard);

  const [quickTitle, setQuickTitle] = useState("");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  function submitQuick(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = quickTitle.trim();
    const firstColumnId = board?.columns[0]?.id;
    if (!trimmed || !firstColumnId) return;
    addCard(firstColumnId, { title: trimmed });
    setQuickTitle("");
  }

  return (
    <div className="flex h-screen flex-col gap-2 rounded-xl border bg-background/95 p-2 text-sm shadow-lg backdrop-blur">
      {/* 이 영역을 잡고 창을 옮긴다 */}
      <div
        data-tauri-drag-region
        className="flex cursor-move items-center justify-between px-1"
      >
        <span data-tauri-drag-region className="font-semibold">
          칸반보드
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={openFullBoard}
        >
          풀보드
        </Button>
      </div>

      {!isLoaded || !board ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-2 overflow-y-auto"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
        >
          {board.columns.map((column) => (
            <WidgetColumn
              key={column.id}
              column={column}
              board={board}
              onOpenCard={setOpenCardId}
            />
          ))}
        </div>
      )}

      <form onSubmit={submitQuick} className="flex gap-1">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="빠른 추가"
          className="h-8"
        />
        <Button type="submit" size="sm" disabled={!quickTitle.trim()}>
          추가
        </Button>
      </form>

      <CardDetailDialog
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
    </div>
  );
}

function WidgetColumn({
  column,
  board,
  onOpenCard,
}: {
  column: Column;
  board: Board;
  onOpenCard: (cardId: string) => void;
}) {
  const today = todayISODate();
  const cards = column.cardIds
    .map((id) => board.cards[id])
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-muted/50 p-1">
      <span className="truncate px-1 text-xs font-medium">
        {column.title}{" "}
        <span className="font-normal text-muted-foreground">{cards.length}</span>
      </span>
      <div className="flex flex-col gap-1 overflow-y-auto">
        {cards.map((card) => (
          <CardContextMenu key={card.id} card={card} onOpen={onOpenCard}>
            <div className="rounded border bg-card px-1.5 py-1">
              <p className="truncate text-xs font-medium">{card.title}</p>
              {card.dueDate && (
                <span
                  className={
                    card.dueDate <= today
                      ? "text-[10px] text-destructive"
                      : "text-[10px] text-muted-foreground"
                  }
                >
                  📅 {card.dueDate}
                </span>
              )}
            </div>
          </CardContextMenu>
        ))}
      </div>
    </div>
  );
}
