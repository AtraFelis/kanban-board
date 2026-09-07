import { useEffect, useState } from "react";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";

import { CardContextMenu } from "@/components/board/CardContextMenu";
import { CardDetailDialog } from "@/components/board/CardDetailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { todayISODate } from "@/lib/date";
import { getWidgetLocked, setWidgetLocked } from "@/lib/widgetSettings";
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

// 잠금 상태를 창에 반영: 잠그면 크기 조절 불가.
async function applyLockToWindow(locked: boolean) {
  try {
    await getCurrentWindow().setResizable(!locked);
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
  const [locked, setLocked] = useState(getWidgetLocked);

  useEffect(() => {
    void init();
  }, [init]);

  // 잠금 상태를 저장하고 창에 반영한다 (첫 마운트 포함).
  useEffect(() => {
    setWidgetLocked(locked);
    void applyLockToWindow(locked);
  }, [locked]);

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
      {/* 잠겨 있지 않을 때만 이 영역을 잡고 창을 옮길 수 있다 */}
      <div
        {...(locked ? {} : { "data-tauri-drag-region": true })}
        className={`flex items-center justify-between px-1 ${
          locked ? "" : "cursor-move"
        }`}
      >
        <span {...(locked ? {} : { "data-tauri-drag-region": true })} className="font-semibold">
          칸반보드
        </span>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                aria-label="위젯 설정"
              >
                ⚙
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setLocked((v) => !v)}>
                {locked ? "위치·크기 고정 해제" : "위치·크기 고정"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      </div>

      {!isLoaded || !board ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : (
        <div
          className="grid min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-auto"
          style={{
            gridTemplateColumns: `repeat(${Math.max(board.columns.length, 1)}, minmax(150px, 1fr))`,
          }}
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
