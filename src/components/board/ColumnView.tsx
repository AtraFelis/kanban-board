import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ask } from "@tauri-apps/plugin-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { friendlyDateLabel, todayISODate, toISODate } from "@/lib/date";
import { nextSort, sortCards, sortSummary } from "@/lib/sortCards";
import { useBoardStore } from "@/store/boardStore";
import type { Card, Column } from "@/types";

import { CardGroup } from "./CardGroup";
import { ColumnContextMenu } from "./ColumnContextMenu";
import { SortableCard } from "./SortableCard";

interface ColumnViewProps {
  column: Column;
  cards: Card[];
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
  className?: string;
  columnMenuExtra?: React.ReactNode;
}

interface DateGroup {
  key: string;
  label: string;
  cardIds: string[];
  defaultCollapsed: boolean;
}

// 완료 컬럼: 카드를 완료한 날짜(completedAt, 없으면 createdAt)로 묶는다. 최신 그룹이 위.
function dateGroups(cards: Card[]): DateGroup[] {
  const buckets = new Map<string, string[]>();
  for (const card of cards) {
    const key = toISODate(card.completedAt ?? card.createdAt);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(card.id);
    else buckets.set(key, [card.id]);
  }
  const today = todayISODate();
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, cardIds]) => ({
      key,
      label: friendlyDateLabel(key),
      cardIds,
      defaultCollapsed: key !== today,
    }));
}

// 컬럼 한 개: 제목 편집, 카드 목록(드롭 대상), 우클릭·더블클릭으로 카드 추가, 컬럼 삭제.
export function ColumnView({
  column,
  cards,
  onOpenCard,
  onOpenCreate,
  className,
  columnMenuExtra,
}: ColumnViewProps) {
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const removeColumn = useBoardStore((s) => s.removeColumn);
  const doneColumnId = useBoardStore((s) => s.board?.doneColumnId);
  const setDoneColumn = useBoardStore((s) => s.setDoneColumn);
  const setColumnSort = useBoardStore((s) => s.setColumnSort);
  const isDone = column.id === doneColumnId;

  // 정렬은 화면 표시만 바꾼다. cardIds 원본 순서는 그대로.
  const sortedCards = sortCards(cards, column.sort);
  const sortLabel = sortSummary(column.sort);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  // 완료 컬럼 날짜 그룹의 접힘 상태 (날짜 키 → 접힘). 영속화하지 않는다.
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );

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
      className={className}
      extraItems={columnMenuExtra}
      isDone={isDone}
      onSetDone={() => setDoneColumn(isDone ? null : column.id)}
      sort={column.sort}
      onSetSort={(s) => setColumnSort(column.id, s)}
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

      {sortLabel && (
        <div className="-mt-1 flex items-center gap-0.5 self-start text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={() => {
              if (column.sort && column.sort.by !== "manual") {
                setColumnSort(column.id, nextSort(column.sort, column.sort.by));
              }
            }}
            title="클릭하면 오름차순 ↔ 내림차순"
            className="rounded px-1 hover:bg-accent hover:text-foreground"
          >
            정렬: {sortLabel}
          </button>
          <button
            type="button"
            onClick={() => setColumnSort(column.id, null)}
            title="정렬 해제"
            aria-label="정렬 해제"
            className="rounded px-0.5 hover:bg-accent hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={setNodeRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onOpenCreate(column.id);
        }}
        className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-md p-0.5 transition-colors ${
          isOver ? "bg-accent/60" : ""
        }`}
      >
        {isDone ? (
          <>
            {dateGroups(sortedCards).map((g) => {
              const collapsed = collapsedGroups[g.key] ?? g.defaultCollapsed;
              const groupCards = sortedCards.filter((card) =>
                g.cardIds.includes(card.id),
              );
              return (
                <CardGroup
                  key={g.key}
                  label={g.label}
                  count={g.cardIds.length}
                  collapsed={collapsed}
                  onToggle={() =>
                    setCollapsedGroups((c) => ({ ...c, [g.key]: !collapsed }))
                  }
                >
                  <SortableContext
                    items={collapsed ? [] : g.cardIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {!collapsed &&
                      groupCards.map((card) => (
                        <SortableCard
                          key={card.id}
                          card={card}
                          onOpen={onOpenCard}
                        />
                      ))}
                  </SortableContext>
                </CardGroup>
              );
            })}
            {cards.length === 0 && (
              <p className="pointer-events-none px-1 pt-1 text-xs text-muted-foreground">
                완료한 카드가 여기에 쌓입니다.
              </p>
            )}
          </>
        ) : (
          <>
            <SortableContext
              items={sortedCards.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              {sortedCards.map((card) => (
                <SortableCard key={card.id} card={card} onOpen={onOpenCard} />
              ))}
            </SortableContext>
            {cards.length === 0 && (
              <p className="pointer-events-none px-1 pt-1 text-xs text-muted-foreground">
                더블클릭하거나 우클릭해서 카드를 추가하세요.
              </p>
            )}
          </>
        )}
      </div>
    </ColumnContextMenu>
  );
}
