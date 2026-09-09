import { useMemo, useRef, useState } from "react";
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
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { columnGridStyle, FULLBOARD_MIN_ROW_HEIGHT } from "@/lib/columnGrid";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Card, Column } from "@/types";

import { CardView } from "./CardView";
import { ColumnView } from "./ColumnView";
import { ConfirmDialog } from "./ConfirmDialog";

// 완료 컬럼에서 다른 컬럼으로 옮길 때 확인받을 이동 정보.
interface PendingLeaveDone {
  cardId: string;
  toColumnId: string;
  toIndex: number;
  sectionId: string | null;
}

// 드롭 위치. sectionId: string=그 섹션, null=미분류, undefined=지정 없음(컬럼 배경).
interface DropTarget {
  columnId: string;
  index: number;
  sectionId?: string | null;
}

// 카드 id로 그 카드가 속한 컬럼 id를 찾는다.
function findColumnIdOfCard(board: Board, cardId: string): string | undefined {
  return board.columns.find((column) => column.cardIds.includes(cardId))?.id;
}

// 드롭 위치(over)로부터 목표 컬럼 id·삽입 인덱스·섹션을 계산한다.
function resolveDropTarget(
  board: Board,
  overId: string,
  overData: Record<string, unknown> | undefined,
): DropTarget | undefined {
  const overType = overData?.type as string | undefined;

  if (overType === "column") {
    // 컬럼 빈 영역 droppable은 id=column.id, 순서변경용 sortable은 id="column:"+id라
    // data.columnId를 우선 쓴다.
    const columnId = (overData?.columnId as string | undefined) ?? overId;
    const column = board.columns.find((c) => c.id === columnId);
    if (!column) return undefined;
    // 컬럼 빈 영역에 떨구면 '미분류'로. (섹션 없는 컬럼은 어차피 sectionId가 없어 무해)
    return { columnId: column.id, index: column.cardIds.length, sectionId: null };
  }

  if (overType === "section") {
    const columnId = overData?.columnId as string | undefined;
    const column = board.columns.find((c) => c.id === columnId);
    if (!column) return undefined;
    const sectionId = (overData?.sectionId as string | null | undefined) ?? null;
    return { columnId: column.id, index: column.cardIds.length, sectionId };
  }

  // 카드 위에 드롭 → 그 카드의 컬럼·섹션, cardIds 상의 위치.
  const columnId = findColumnIdOfCard(board, overId);
  if (!columnId) return undefined;
  const column = board.columns.find((c) => c.id === columnId)!;
  return {
    columnId,
    index: column.cardIds.indexOf(overId),
    sectionId: board.cards[overId]?.sectionId ?? null,
  };
}

interface BoardColumnsProps {
  board: Board;
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
  // 컬럼 컨테이너 클래스 (풀보드/위젯 크기감 분리). 미지정 시 ColumnView 기본값.
  columnClassName?: string;
  // 컬럼 우클릭 메뉴에 덧붙일 항목 (위젯이 위젯 설정을 넣는다).
  columnMenuExtra?: React.ReactNode;
  // 컬럼 하단 빠른 추가 바 (풀보드 전용).
  quickAdd?: boolean;
  // 컬럼 헤더의 손잡이로 컬럼 순서를 드래그 변경할 수 있게 한다 (풀보드 전용).
  columnReorder?: boolean;
  // 한 행(컬럼 줄) 최소 높이(px). 이 아래로는 안 줄고, 넘치면 컨테이너가 스크롤된다.
  minRowHeight?: number;
}

// useSortable에 쓰는 컬럼 id. ColumnView가 이미 id=column.id로 useDroppable을
// 등록하므로 충돌을 피하려고 접두어를 붙인다.
const COLUMN_SORT_PREFIX = "column:";

// 컬럼 순서 변경용 래퍼. 헤더에 넣을 드래그 손잡이를 ColumnView에 넘긴다.
function SortableColumn({
  column,
  cards,
  onOpenCard,
  onOpenCreate,
  isDragging,
  quickAdd,
}: {
  column: Column;
  cards: Card[];
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
  isDragging: boolean;
  quickAdd?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging,
  } = useSortable({
    id: COLUMN_SORT_PREFIX + column.id,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`grid min-h-0 min-w-0 ${isColumnDragging ? "opacity-40" : ""}`}
    >
      <ColumnView
        column={column}
        cards={cards}
        onOpenCard={onOpenCard}
        onOpenCreate={onOpenCreate}
        isDragging={isDragging}
        quickAdd={quickAdd}
        dragHandle={
          <button
            type="button"
            aria-label="컬럼 위치 이동"
            className="shrink-0 cursor-grab touch-none rounded px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            ⠿
          </button>
        }
      />
    </div>
  );
}

// 컬럼 그리드 + 카드 드래그 앤 드롭. 풀보드와 위젯이 공유한다.
export function BoardColumns({
  board,
  onOpenCard,
  onOpenCreate,
  columnClassName,
  columnMenuExtra,
  quickAdd,
  columnReorder,
  minRowHeight = FULLBOARD_MIN_ROW_HEIGHT,
}: BoardColumnsProps) {
  const moveCard = useBoardStore((s) => s.moveCard);
  const moveColumn = useBoardStore((s) => s.moveColumn);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [pendingLeaveDone, setPendingLeaveDone] =
    useState<PendingLeaveDone | null>(null);
  // 드래그 시작 시점의 카드 위치. 미리보기 이동 뒤 원위치로 되돌리거나, 완료 컬럼
  // 진입/이탈 여부를 판단할 때 "실제 출발점"으로 쓴다.
  type DragOrigin = { columnId: string; index: number; sectionId: string | null };
  const dragOriginRef = useRef<DragOrigin | null>(null);
  // 보드 그리드 영역. 드래그 포인터가 이 밖이면 미리보기 이동을 하지 않는다.
  const gridRef = useRef<HTMLDivElement>(null);
  // 마지막으로 적용한 미리보기 대상 시그니처. 같은 값이면 moveCard를 반복하지 않는다.
  const lastPreviewSigRef = useRef<string | null>(null);

  // 드래그 포인터의 현재 화면 좌표 (activatorEvent + delta). 마우스/포인터 드래그만.
  function dragPointer(event: {
    activatorEvent: Event;
    delta: { x: number; y: number };
  }): { x: number; y: number } | null {
    const a = event.activatorEvent;
    if (!(a instanceof MouseEvent)) return null;
    return { x: a.clientX + event.delta.x, y: a.clientY + event.delta.y };
  }

  // 포인터가 보드 그리드 밖(창 밖 포함)에 있는지. 좌표를 못 구하면 false(안쪽 취급).
  function pointerOutsideBoard(event: {
    activatorEvent: Event;
    delta: { x: number; y: number };
  }): boolean {
    const p = dragPointer(event);
    const el = gridRef.current;
    if (!p || !el) return false;
    const r = el.getBoundingClientRect();
    return p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom;
  }

  function snapBackToOrigin(cardId: string, origin: DragOrigin | null) {
    if (!origin) return;
    moveCard(cardId, origin.columnId, origin.index, {
      sectionId: origin.sectionId,
      skipCompletion: true,
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const activeCard = useMemo<Card | null>(
    () => (activeCardId ? (board.cards[activeCardId] ?? null) : null),
    [activeCardId, board],
  );

  const activeColumn = useMemo<Column | null>(
    () =>
      activeColumnId
        ? (board.columns.find((c) => c.id === activeColumnId) ?? null)
        : null,
    [activeColumnId, board],
  );

  // 드래그 대상이 컬럼(순서 변경)인지.
  function isColumnDrag(event: {
    active: { data: { current?: Record<string, unknown> } };
  }): boolean {
    return event.active.data.current?.type === "column";
  }

  // over 위치에서 대상 컬럼 id를 뽑는다 (컬럼/섹션/카드 어느 것 위든).
  function columnIdFromOver(
    overId: string,
    overData: Record<string, unknown> | undefined,
  ): string | undefined {
    const t = overData?.type as string | undefined;
    if (t === "column" || t === "section") {
      return (overData?.columnId as string | undefined) ?? overId;
    }
    return findColumnIdOfCard(board, overId);
  }

  // 컬럼 순서 드래그 확정.
  function handleColumnDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeColId = active.data.current?.columnId as string | undefined;
    setActiveColumnId(null);
    if (!over || !activeColId) return;
    const overColId = columnIdFromOver(
      String(over.id),
      over.data.current as Record<string, unknown> | undefined,
    );
    if (!overColId || overColId === activeColId) return;
    const toIndex = board.columns.findIndex((c) => c.id === overColId);
    if (toIndex === -1) return;
    moveColumn(activeColId, toIndex);
  }

  function handleDragStart(event: DragStartEvent) {
    // 컬럼 순서 드래그는 카드 로직을 건너뛴다.
    if (isColumnDrag(event)) {
      setActiveColumnId(event.active.data.current?.columnId as string);
      return;
    }
    const activeId = String(event.active.id);
    setActiveCardId(activeId);
    lastPreviewSigRef.current = null;
    const columnId = findColumnIdOfCard(board, activeId);
    const column = columnId
      ? board.columns.find((c) => c.id === columnId)
      : undefined;
    dragOriginRef.current = column
      ? {
          columnId: column.id,
          index: column.cardIds.indexOf(activeId),
          sectionId: board.cards[activeId]?.sectionId ?? null,
        }
      : null;
  }

  // 다른 컬럼/섹션 위로 지나갈 때 실시간으로 카드를 옮겨 미리보기를 보여준다.
  // 미리보기 이동에는 skipCompletion을 줘서 completedAt은 건드리지 않는다 (완료 컬럼
  // 위를 잠깐 지나가는 것만으로 완료 처리되지 않게).
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    // 컬럼 순서 드래그는 미리보기 이동 없이 dragEnd에서만 확정한다.
    if (isColumnDrag(event)) return;
    if (!over) return;
    // 포인터가 보드 밖(창 밖 등)이면 미리보기 이동을 하지 않는다. closestCorners가
    // 반환한 먼 대상으로 카드를 왕복시키며 매 프레임 전체 리렌더 → 크래시를 막는다.
    if (pointerOutsideBoard(event)) return;
    const activeId = String(active.id);
    const fromColumnId = findColumnIdOfCard(board, activeId);
    const target = resolveDropTarget(
      board,
      String(over.id),
      over.data.current as Record<string, unknown> | undefined,
    );
    if (!fromColumnId || !target) return;

    const sameColumn = fromColumnId === target.columnId;
    if (sameColumn) {
      // 같은 컬럼: 섹션/카드 위에서 섹션이 바뀔 때만 실시간 반영. 컬럼 빈 영역 hover나
      // 단순 순서 변경은 dragEnd에서 처리(미리보기가 튀지 않도록).
      const overType = over.data.current?.type as string | undefined;
      if (overType === "column" || target.sectionId === undefined) return;
      const curSection = board.cards[activeId]?.sectionId ?? null;
      if (curSection === (target.sectionId ?? null)) return;
    }
    // 같은 대상으로 반복 moveCard 하지 않는다 (포인터 정지 시 storm 방지).
    const sig = `${target.columnId}|${target.index}|${target.sectionId ?? "-"}`;
    if (sig === lastPreviewSigRef.current) return;
    lastPreviewSigRef.current = sig;
    moveCard(activeId, target.columnId, target.index, {
      sectionId: target.sectionId,
      skipCompletion: true,
    });
  }

  // 드롭 확정: 실제 출발점(dragOrigin) 기준으로 완료 처리·경고를 판단한다.
  function handleDragEnd(event: DragEndEvent) {
    if (isColumnDrag(event)) {
      handleColumnDragEnd(event);
      return;
    }
    const { active, over } = event;
    setActiveCardId(null);
    const activeId = String(active.id);
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;
    lastPreviewSigRef.current = null;

    // 보드 밖에 놓으면(창 밖 등) 취소로 보고 원위치.
    if (!over || pointerOutsideBoard(event)) {
      snapBackToOrigin(activeId, origin);
      return;
    }

    // 드롭 대상 계산. 자기 자신(미리보기 위치) 위에 놓았거나 대상을 못 찾으면,
    // 미리보기로 옮겨진 현재 위치를 그대로 확정한다.
    let target = resolveDropTarget(
      board,
      String(over.id),
      over.data.current as Record<string, unknown> | undefined,
    );
    if (String(over.id) === activeId || !target) {
      const curColId = findColumnIdOfCard(board, activeId);
      const curCol = curColId
        ? board.columns.find((c) => c.id === curColId)
        : undefined;
      if (!curCol) {
        snapBackToOrigin(activeId, origin);
        return;
      }
      target = {
        columnId: curCol.id,
        index: curCol.cardIds.indexOf(activeId),
        sectionId: board.cards[activeId]?.sectionId ?? null,
      };
    }

    const originColumnId = origin?.columnId;
    const originSectionId = origin?.sectionId ?? null;
    const targetSection =
      target.sectionId === undefined ? originSectionId : (target.sectionId ?? null);
    const sameColumn = originColumnId === target.columnId;
    const sameSection = originSectionId === targetSection;

    // 정렬이 켜진 컬럼에서 같은 컬럼·같은 섹션 재배치는 무시하고 원위치로.
    if (sameColumn && sameSection) {
      const col = board.columns.find((c) => c.id === target.columnId);
      if (col?.sort && col.sort.by !== "manual") {
        snapBackToOrigin(activeId, origin);
        return;
      }
    }

    const doneId = board.doneColumnId;
    // 완료 컬럼 → 다른 컬럼: 일단 원위치(완료)로 되돌리고 확인 팝업을 띄운다.
    if (doneId && originColumnId === doneId && target.columnId !== doneId) {
      snapBackToOrigin(activeId, origin);
      const leave: PendingLeaveDone = {
        cardId: activeId,
        toColumnId: target.columnId,
        toIndex: target.index,
        sectionId: target.sectionId ?? null,
      };
      // 드롭을 끝낸 pointerup이 갓 열린 다이얼로그를 곧바로 닫아버리지 않도록 한 틱 미룬다.
      setTimeout(() => setPendingLeaveDone(leave), 0);
      return;
    }

    // 실제 이동 확정 (완료 진입/이탈에 따른 completedAt 자동 갱신 포함).
    moveCard(activeId, target.columnId, target.index, {
      sectionId: target.sectionId,
    });
  }

  const columnNodes = board.columns.map((column) => {
    const cards = column.cardIds
      .map((id) => board.cards[id])
      .filter((card): card is Card => Boolean(card));
    if (columnReorder) {
      return (
        <SortableColumn
          key={column.id}
          column={column}
          cards={cards}
          onOpenCard={onOpenCard}
          onOpenCreate={onOpenCreate}
          isDragging={activeCardId !== null}
          quickAdd={quickAdd}
        />
      );
    }
    return (
      <ColumnView
        key={column.id}
        column={column}
        cards={cards}
        onOpenCard={onOpenCard}
        onOpenCreate={onOpenCreate}
        className={columnClassName}
        columnMenuExtra={columnMenuExtra}
        isDragging={activeCardId !== null}
        quickAdd={quickAdd}
      />
    );
  });

  const grid = (
    <div
      ref={gridRef}
      className="grid min-h-0 flex-1 gap-3 overflow-y-auto pb-2"
      style={columnGridStyle(minRowHeight)}
    >
      {columnReorder ? (
        <SortableContext
          items={board.columns.map((c) => COLUMN_SORT_PREFIX + c.id)}
          strategy={horizontalListSortingStrategy}
        >
          {columnNodes}
        </SortableContext>
      ) : (
        columnNodes
      )}
    </div>
  );

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={(event) => {
        lastPreviewSigRef.current = null;
        if (isColumnDrag(event)) {
          setActiveColumnId(null);
          return;
        }
        setActiveCardId(null);
        snapBackToOrigin(String(event.active.id), dragOriginRef.current);
        dragOriginRef.current = null;
      }}
    >
      {/* 넓으면 한 줄에 나눠 채우고, 좁으면 아랫줄로 접히는 그리드 (가로 스크롤 없음) */}
      {grid}

      <DragOverlay>
        {activeColumn ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted p-2 opacity-95 shadow-xl ring-1 ring-border">
            <div className="px-1 text-sm font-semibold">
              {activeColumn.title}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {activeColumn.cardIds.length}
              </span>
            </div>
          </div>
        ) : activeCard ? (
          <CardView card={activeCard} />
        ) : null}
      </DragOverlay>
    </DndContext>

      <ConfirmDialog
        open={pendingLeaveDone !== null}
        title="완료 취소"
        description="이 카드를 '완료'에서 빼면 완료일 기록이 사라집니다."
        confirmLabel="빼기"
        cancelLabel="취소"
        destructive
        onConfirm={() => {
          if (pendingLeaveDone) {
            moveCard(
              pendingLeaveDone.cardId,
              pendingLeaveDone.toColumnId,
              pendingLeaveDone.toIndex,
              { sectionId: pendingLeaveDone.sectionId },
            );
          }
          setPendingLeaveDone(null);
        }}
        onCancel={() => setPendingLeaveDone(null)}
      />
    </>
  );
}
