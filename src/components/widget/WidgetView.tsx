import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";

import { CardContextMenu } from "@/components/board/CardContextMenu";
import { CardDetailDialog } from "@/components/board/CardDetailDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { exportBoardToFile, importBoardFromFile } from "@/lib/boardIO";
import { COLUMN_GRID_STYLE } from "@/lib/columnGrid";
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

// "바탕화면에 고정" 상태를 창에 반영한다.
// - 크기 조절 불가 (드래그 영역 제거는 렌더에서 처리)
// - 항상 다른 창들 뒤로 (Rust set_widget_pinned가 z-order/NOACTIVATE 처리)
async function applyPinToWindow(pinned: boolean) {
  try {
    await getCurrentWindow().setResizable(!pinned);
    await invoke("set_widget_pinned", { pinned });
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
  const replaceBoard = useBoardStore((s) => s.replaceBoard);

  const [quickTitle, setQuickTitle] = useState("");
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [locked, setLocked] = useState(getWidgetLocked);

  useEffect(() => {
    void init();
  }, [init]);

  // 잠금 상태를 저장하고 창에 반영한다 (첫 마운트 포함).
  useEffect(() => {
    setWidgetLocked(locked);
    void applyPinToWindow(locked);
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
                {locked ? "바탕화면 고정 해제" : "바탕화면에 고정"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  if (board) void exportBoardToFile(board);
                }}
              >
                내보내기 (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void importBoardFromFile(replaceBoard)}
              >
                가져오기 (JSON)
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
          className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto"
          style={COLUMN_GRID_STYLE}
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
        {cards.map((card) => {
          const doneCount = card.checklist.filter((i) => i.done).length;
          const hasMeta =
            Boolean(card.dueDate) ||
            card.checklist.length > 0 ||
            card.labels.length > 0;
          return (
            <CardContextMenu key={card.id} card={card} onOpen={onOpenCard}>
              <div className="rounded border bg-card px-1.5 py-1">
                <p className="truncate text-xs font-medium">{card.title}</p>
                {hasMeta && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {card.dueDate && (
                      <span
                        className={
                          card.dueDate <= today ? "text-destructive" : undefined
                        }
                      >
                        📅 {card.dueDate}
                      </span>
                    )}
                    {card.checklist.length > 0 && (
                      <span>
                        ☑ {doneCount}/{card.checklist.length}
                      </span>
                    )}
                    {card.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded bg-secondary px-1 py-0.5"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContextMenu>
          );
        })}
      </div>
    </div>
  );
}
