import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Card, Column } from "@/types";

interface ColumnViewProps {
  column: Column;
  cards: Card[];
  renderCard: (card: Card) => React.ReactNode;
}

// 컬럼 한 개: 제목 편집, 카드 목록, 카드 추가, 컬럼 삭제.
export function ColumnView({ column, cards, renderCard }: ColumnViewProps) {
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const removeColumn = useBoardStore((s) => s.removeColumn);
  const addCard = useBoardStore((s) => s.addCard);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [newCardTitle, setNewCardTitle] = useState("");

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) {
      renameColumn(column.id, trimmed);
    } else {
      setTitleDraft(column.title);
    }
    setIsEditingTitle(false);
  }

  function submitNewCard(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    addCard(column.id, trimmed);
    setNewCardTitle("");
  }

  return (
    <div className="flex h-full w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-2">
      <div className="flex items-center gap-1">
        {isEditingTitle ? (
          <Input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(column.title);
                setIsEditingTitle(false);
              }
            }}
            className="h-7"
          />
        ) : (
          <button
            type="button"
            className="flex-1 rounded px-1 py-0.5 text-left text-sm font-semibold hover:bg-accent"
            onClick={() => {
              setTitleDraft(column.title);
              setIsEditingTitle(true);
            }}
          >
            {column.title}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {cards.length}
            </span>
          </button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="컬럼 삭제"
          onClick={() => {
            if (confirm(`"${column.title}" 컬럼을 삭제할까요? 카드도 함께 삭제됩니다.`)) {
              removeColumn(column.id);
            }
          }}
        >
          ✕
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {cards.map((card) => (
          <div key={card.id}>{renderCard(card)}</div>
        ))}
      </div>

      <form onSubmit={submitNewCard} className="flex gap-1">
        <Input
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          placeholder="+ 카드 추가"
          className="h-8"
        />
        <Button type="submit" size="sm" disabled={!newCardTitle.trim()}>
          추가
        </Button>
      </form>
    </div>
  );
}
