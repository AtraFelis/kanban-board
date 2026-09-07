import { useEffect, useMemo, useState } from "react";
import { Window } from "@tauri-apps/api/window";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { todayISODate } from "@/lib/date";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

const RECENT_COUNT = 5;

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

// 바탕화면에 상주하는 작은 요약 창. 마감 임박/지난 카드 + 최근 카드 + 빠른 추가.
export function WidgetView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const addCard = useBoardStore((s) => s.addCard);

  const [quickTitle, setQuickTitle] = useState("");

  useEffect(() => {
    void init();
  }, [init]);

  const { dueCards, recentCards, firstColumnId, columnTitleOf } = useMemo(() => {
    if (!board) {
      return {
        dueCards: [] as Card[],
        recentCards: [] as Card[],
        firstColumnId: undefined as string | undefined,
        columnTitleOf: (_: string) => "",
      };
    }
    const today = todayISODate();
    const titleByCardId = new Map<string, string>();
    for (const column of board.columns) {
      for (const cardId of column.cardIds) titleByCardId.set(cardId, column.title);
    }
    const all = Object.values(board.cards);
    const dueCards = all
      .filter((c) => c.dueDate && c.dueDate <= today)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
    const recentCards = [...all]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, RECENT_COUNT);
    return {
      dueCards,
      recentCards,
      firstColumnId: board.columns[0]?.id,
      columnTitleOf: (cardId: string) => titleByCardId.get(cardId) ?? "",
    };
  }, [board]);

  function submitQuick(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || !firstColumnId) return;
    addCard(firstColumnId, { title: trimmed });
    setQuickTitle("");
  }

  return (
    <div className="flex h-screen flex-col gap-2 rounded-xl border bg-background/90 p-3 text-sm shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="font-semibold">칸반보드</span>
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
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          <WidgetSection title={`마감 임박 · 지남 (${dueCards.length})`}>
            {dueCards.length === 0 ? (
              <p className="text-xs text-muted-foreground">없음</p>
            ) : (
              dueCards.map((card) => (
                <WidgetCardRow
                  key={card.id}
                  card={card}
                  columnTitle={columnTitleOf(card.id)}
                  showDue
                />
              ))
            )}
          </WidgetSection>

          <WidgetSection title="최근">
            {recentCards.length === 0 ? (
              <p className="text-xs text-muted-foreground">없음</p>
            ) : (
              recentCards.map((card) => (
                <WidgetCardRow
                  key={card.id}
                  card={card}
                  columnTitle={columnTitleOf(card.id)}
                />
              ))
            )}
          </WidgetSection>
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
    </div>
  );
}

function WidgetSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

function WidgetCardRow({
  card,
  columnTitle,
  showDue,
}: {
  card: Card;
  columnTitle: string;
  showDue?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card px-2 py-1">
      <p className="truncate text-xs font-medium">{card.title}</p>
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        {columnTitle && <span>{columnTitle}</span>}
        {showDue && card.dueDate && <span>📅 {card.dueDate}</span>}
      </div>
    </div>
  );
}
