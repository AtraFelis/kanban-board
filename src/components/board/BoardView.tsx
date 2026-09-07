import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

import { CardView } from "./CardView";
import { ColumnView } from "./ColumnView";

// 풀보드 모드 최상위. 스토어를 초기화하고 컬럼들을 가로로 배치한다.
export function BoardView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const addColumn = useBoardStore((s) => s.addColumn);

  const [newColumnTitle, setNewColumnTitle] = useState("");

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

  function submitNewColumn(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    addColumn(trimmed);
    setNewColumnTitle("");
  }

  return (
    <div className="flex h-screen flex-col gap-3 p-3">
      <h1 className="text-lg font-semibold">{board.title}</h1>

      <div className="flex flex-1 items-start gap-3 overflow-x-auto pb-2">
        {board.columns.map((column) => {
          const cards = column.cardIds
            .map((id) => board.cards[id])
            .filter((card): card is Card => Boolean(card));
          return (
            <ColumnView
              key={column.id}
              column={column}
              cards={cards}
              renderCard={(card) => <CardView card={card} />}
            />
          );
        })}

        <form
          onSubmit={submitNewColumn}
          className="flex w-72 shrink-0 gap-1 rounded-lg border border-dashed p-2"
        >
          <Input
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="+ 컬럼 추가"
            className="h-8"
          />
          <Button type="submit" size="sm" disabled={!newColumnTitle.trim()}>
            추가
          </Button>
        </form>
      </div>
    </div>
  );
}
