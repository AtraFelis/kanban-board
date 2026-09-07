import { useEffect, useMemo, useState } from "react";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Card } from "@/types";

import { CardDetailDialog } from "./CardDetailDialog";
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

// 풀보드 모드 최상위. 스토어를 초기화하고 컬럼들을 가로로 배치한다.
export function BoardView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const addColumn = useBoardStore((s) => s.addColumn);
  const moveCard = useBoardStore((s) => s.moveCard);

  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    void init();
  }, [init]);

  const activeCard = useMemo<Card | null>(
    () => (activeCardId && board ? (board.cards[activeCardId] ?? null) : null),
    [activeCardId, board],
  );

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

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(String(event.active.id));
  }

  // 다른 컬럼 위로 지나갈 때 실시간으로 카드를 옮겨 미리보기를 보여준다.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const fromColumnId = findColumnIdOfCard(board, activeId);
    const target = resolveDropTarget(
      board,
      overId,
      over.data.current?.type as string | undefined,
    );
    if (!fromColumnId || !target || fromColumnId === target.columnId) return;

    moveCard(activeId, target.columnId, target.index);
  }

  // 드롭 확정: 같은 컬럼 내 순서 변경을 마무리한다.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const target = resolveDropTarget(
      board,
      overId,
      over.data.current?.type as string | undefined,
    );
    if (!target) return;

    moveCard(activeId, target.columnId, target.index);
  }

  return (
    <div className="flex h-screen flex-col gap-3 p-3">
      <h1 className="text-lg font-semibold">{board.title}</h1>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCardId(null)}
      >
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
                onOpenCard={setOpenCardId}
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

        <DragOverlay>
          {activeCard ? <CardView card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDetailDialog
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
    </div>
  );
}
