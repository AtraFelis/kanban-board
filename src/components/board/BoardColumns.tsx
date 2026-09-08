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
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { COLUMN_GRID_STYLE } from "@/lib/columnGrid";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Card } from "@/types";

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
    const column = board.columns.find((c) => c.id === overId);
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
}

// 컬럼 그리드 + 카드 드래그 앤 드롭. 풀보드와 위젯이 공유한다.
export function BoardColumns({
  board,
  onOpenCard,
  onOpenCreate,
  columnClassName,
  columnMenuExtra,
}: BoardColumnsProps) {
  const moveCard = useBoardStore((s) => s.moveCard);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [pendingLeaveDone, setPendingLeaveDone] =
    useState<PendingLeaveDone | null>(null);
  // 드래그 시작 시점의 카드 위치. 미리보기 이동 뒤 원위치로 되돌리거나, 완료 컬럼
  // 진입/이탈 여부를 판단할 때 "실제 출발점"으로 쓴다.
  type DragOrigin = { columnId: string; index: number; sectionId: string | null };
  const dragOriginRef = useRef<DragOrigin | null>(null);

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

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    setActiveCardId(activeId);
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
    if (!over) return;
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
    moveCard(activeId, target.columnId, target.index, {
      sectionId: target.sectionId,
      skipCompletion: true,
    });
  }

  // 드롭 확정: 실제 출발점(dragOrigin) 기준으로 완료 처리·경고를 판단한다.
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCardId(null);
    const activeId = String(active.id);
    const origin = dragOriginRef.current;
    dragOriginRef.current = null;

    if (!over) {
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

  return (
    <>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={(event) => {
        setActiveCardId(null);
        snapBackToOrigin(String(event.active.id), dragOriginRef.current);
        dragOriginRef.current = null;
      }}
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
              columnMenuExtra={columnMenuExtra}
              isDragging={activeCardId !== null}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeCard ? <CardView card={activeCard} /> : null}
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
