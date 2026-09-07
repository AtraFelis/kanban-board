import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { COLUMN_GRID_STYLE } from "@/lib/columnGrid";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Card } from "@/types";

import { CardView } from "./CardView";
import { ColumnView } from "./ColumnView";

// 카드 id로 그 카드가 속한 컬럼 id를 찾는다.
function findColumnIdOfCard(board: Board, cardId: string): string | undefined {
  return board.columns.find((column) => column.cardIds.includes(cardId))?.id;
}

// 드롭 위치(over)로부터 목표 컬럼 id와 삽입 인덱스를 계산한다.
function resolveDropTarget(
  board: Board,
  overId: string,
  overType: string | undefined,
): { columnId: string; index: number } | undefined {
  if (overType === "column") {
    const column = board.columns.find((c) => c.id === overId);
    if (!column) return undefined;
    return { columnId: column.id, index: column.cardIds.length };
  }
  const columnId = findColumnIdOfCard(board, overId);
  if (!columnId) return undefined;
  const column = board.columns.find((c) => c.id === columnId)!;
  return { columnId, index: column.cardIds.indexOf(overId) };
}

interface BoardColumnsProps {
  board: Board;
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
  // 컬럼 컨테이너 클래스 (풀보드/위젯 크기감 분리). 미지정 시 ColumnView 기본값.
  columnClassName?: string;
}

// 컬럼 그리드 + 카드 드래그 앤 드롭. 풀보드와 위젯이 공유한다.
export function BoardColumns({
  board,
  onOpenCard,
  onOpenCreate,
  columnClassName,
}: BoardColumnsProps) {
  const moveCard = useBoardStore((s) => s.moveCard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeCard = useMemo<Card | null>(
    () => (activeCardId ? (board.cards[activeCardId] ?? null) : null),
    [activeCardId, board],
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  // 다른 컬럼 위로 지나갈 때 실시간으로 카드를 옮겨 미리보기를 보여준다.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const fromColumnId = findColumnIdOfCard(board, activeId);
    const target = resolveDropTarget(
      board,
      String(over.id),
      over.data.current?.type as string | undefined,
    );
    if (!fromColumnId || !target || fromColumnId === target.columnId) return;
    moveCard(activeId, target.columnId, target.index);
  }

  // 드롭 확정: 같은 컬럼 내 순서 변경을 마무리한다.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const target = resolveDropTarget(
      board,
      overId,
      over.data.current?.type as string | undefined,
    );
    if (target) moveCard(activeId, target.columnId, target.index);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveCardId(null)}
    >
      {/* 넓으면 한 줄에 나눠 채우고, 좁으면 아랫줄로 접히는 그리드 (가로 스크롤 없음) */}
      <div
        className="grid min-h-0 flex-1 gap-3 overflow-y-auto pb-2"
        style={COLUMN_GRID_STYLE}
      >
        {board.columns.map((column) => {
          const cards = column.cardIds
            .map((id) => board.cards[id])
            .filter((card): card is Card => Boolean(card));
          return (
            <ColumnView
              key={column.id}
              column={column}
              cards={cards}
              onOpenCard={onOpenCard}
              onOpenCreate={onOpenCreate}
              className={columnClassName}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard ? <CardView card={activeCard} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
