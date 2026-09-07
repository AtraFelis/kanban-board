import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Card, Column } from "@/types";

import { SortableCard } from "./SortableCard";

interface ColumnViewProps {
  column: Column;
  cards: Card[];
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
}

// 컬럼 한 개: 제목 편집, 카드 목록(드롭 대상), 카드 추가, 컬럼 삭제.
export function ColumnView({
  column,
  cards,
  onOpenCard,
  onOpenCreate,
}: ColumnViewProps) {
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const removeColumn = useBoardStore((s) => s.removeColumn);
  const addCard = useBoardStore((s) => s.addCard);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [newCardDue, setNewCardDue] = useState("");

  // 빈 컬럼에도 카드를 떨어뜨릴 수 있도록 컬럼 자체를 드롭 대상으로 등록.
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) {
      renameColumn(column.id, trimmed);
    } else {
      setTitleDraft(column.title);
    }
    setIsEditingTitle(false);
  }

  // 빠른 추가: 제목(+선택 마감일)만으로 바로 저장. 상세 필드는 상세 추가에서.
  function submitNewCard(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    addCard(column.id, { title: trimmed, dueDate: newCardDue || undefined });
    setNewCardTitle("");
    setNewCardDue("");
  }

  return (
    <div className="flex h-full min-w-[260px] flex-1 flex-col gap-2 rounded-lg bg-muted/50 p-2">
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
            if (
              confirm(
                `"${column.title}" 컬럼을 삭제할까요? 카드도 함께 삭제됩니다.`,
              )
            ) {
              removeColumn(column.id);
            }
          }}
        >
          ✕
        </Button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-1 flex-col gap-2 overflow-y-auto rounded-md p-0.5 transition-colors ${
          isOver ? "bg-accent/60" : ""
        }`}
      >
        <SortableContext
          items={column.cardIds}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </SortableContext>
      </div>

      <form onSubmit={submitNewCard} className="flex flex-col gap-1">
        <Input
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          placeholder="+ 카드 추가"
          className="h-8"
        />
        <div className="flex gap-1">
          <Input
            type="date"
            value={newCardDue}
            onChange={(e) => setNewCardDue(e.target.value)}
            aria-label="마감일 (선택)"
            className="h-8 flex-1"
          />
          <Button type="submit" size="sm" disabled={!newCardTitle.trim()}>
            추가
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onOpenCreate(column.id)}
            title="설명·라벨·체크리스트까지 채워서 추가"
          >
            상세
          </Button>
        </div>
      </form>
    </div>
  );
}
