import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Card, ColumnSection } from "@/types";

import { CardGroup } from "./CardGroup";
import { ConfirmDialog } from "./ConfirmDialog";
import { SortableCard } from "./SortableCard";

interface ColumnSectionGroupProps {
  columnId: string;
  // 실제 섹션이면 그 객체, '미분류' 그룹이면 null.
  section: ColumnSection | null;
  cards: Card[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenCard: (cardId: string) => void;
}

// 컬럼 안의 카테고리 섹션(또는 '미분류') 하나. 자체 드롭 대상 + 접이식 그룹.
export function ColumnSectionGroup({
  columnId,
  section,
  cards,
  collapsed,
  onToggleCollapsed,
  onOpenCard,
}: ColumnSectionGroupProps) {
  const renameSection = useBoardStore((s) => s.renameSection);
  const removeSection = useBoardStore((s) => s.removeSection);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section?.title ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sectionId = section?.id ?? null;
  const { setNodeRef, isOver } = useDroppable({
    id: `${columnId}:${sectionId ?? "none"}`,
    data: { type: "section", columnId, sectionId },
  });

  function startRename() {
    if (!section) return;
    setDraft(section.title);
    setEditing(true);
  }

  function commitRename() {
    const trimmed = draft.trim();
    if (section && trimmed && trimmed !== section.title) {
      renameSection(columnId, section.id, trimmed);
    }
    setEditing(false);
  }

  const label =
    section && editing ? (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-6 text-xs"
      />
    ) : (
      (section?.title ?? "미분류")
    );

  const headerExtra =
    section && !editing ? (
      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label="섹션 이름 변경"
          onClick={startRename}
          className="rounded px-1 hover:bg-accent hover:text-foreground"
        >
          ✎
        </button>
        <button
          type="button"
          aria-label="섹션 삭제"
          onClick={() => setConfirmDelete(true)}
          className="rounded px-1 hover:bg-accent hover:text-destructive"
        >
          ✕
        </button>
      </div>
    ) : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md transition-colors ${isOver ? "bg-accent/40" : ""}`}
    >
      <CardGroup
        label={label}
        count={cards.length}
        collapsed={collapsed}
        onToggle={onToggleCollapsed}
        onLabelDoubleClick={startRename}
        headerExtra={headerExtra}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <SortableCard key={card.id} card={card} onOpen={onOpenCard} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="pointer-events-none px-1 py-1 text-xs text-muted-foreground">
            여기로 카드를 옮겨 분류하세요.
          </p>
        )}
      </CardGroup>

      {section && (
        <ConfirmDialog
          open={confirmDelete}
          title="섹션 삭제"
          description={`"${section.title}" 섹션을 지웁니다. 카드는 삭제되지 않고 '미분류'로 이동합니다.`}
          confirmLabel="삭제"
          destructive
          onConfirm={() => {
            removeSection(columnId, section.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
