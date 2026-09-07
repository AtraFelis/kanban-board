import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ask } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Card, Column } from "@/types";

import { ColumnContextMenu } from "./ColumnContextMenu";
import { SortableCard } from "./SortableCard";

interface ColumnViewProps {
  column: Column;
  cards: Card[];
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
}

// 컬럼 한 개: 제목 편집, 카드 목록(드롭 대상), 우클릭·더블클릭으로 카드 추가, 컬럼 삭제.
export function ColumnView({
  column,
  cards,
  onOpenCard,
  onOpenCreate,
}: ColumnViewProps) {
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const removeColumn = useBoardStore((s) => s.removeColumn);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  // 빈 컬럼에도 카드를 떨어뜨릴 수 있도록 컬럼 자체를 드롭 대상으로 등록.
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  function startRename() {
    setTitleDraft(column.title);
    setIsEditingTitle(true);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) {
      renameColumn(column.id, trimmed);
    } else {
      setTitleDraft(column.title);
    }
    setIsEditingTitle(false);
  }

  async function confirmDelete() {
    const ok = await ask(
      `"${column.title}" 컬럼을 삭제하면 이 컬럼의 카드도 모두 삭제됩니다.\n계속할까요?`,
      { title: "컬럼 삭제", kind: "warning", okLabel: "삭제", cancelLabel: "취소" },
    );
    if (ok) removeColumn(column.id);
  }

  return (
    <ColumnContextMenu
      onAddCard={() => onOpenCreate(column.id)}
      onRename={startRename}
      onDelete={confirmDelete}
      // 카드가 아닌 빈 영역을 더블클릭했을 때만 카드 추가.
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) onOpenCreate(column.id);
      }}
    >
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
            onClick={startRename}
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
          onClick={confirmDelete}
        >
          ✕
        </Button>
      </div>

      <div
        ref={setNodeRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onOpenCreate(column.id);
        }}
        className={`flex min-h-[60px] flex-1 flex-col gap-2 rounded-md p-0.5 transition-colors ${
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

        {cards.length === 0 && (
          <p className="pointer-events-none px-1 pt-1 text-xs text-muted-foreground">
            더블클릭하거나 우클릭해서 카드를 추가하세요.
          </p>
        )}
      </div>
    </ColumnContextMenu>
  );
}
