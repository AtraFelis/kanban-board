import { useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Card } from "@/types";

import { CardContextMenu } from "./CardContextMenu";
import { CardView } from "./CardView";

interface SortableCardProps {
  card: Card;
  onOpen: (cardId: string) => void;
}

// CardView를 @dnd-kit sortable 아이템으로 감싼다.
export function SortableCard({ card, onOpen }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

  // 드래그 직후 브라우저가 발생시키는 click으로 상세 패널이 열리는 것을 막는다.
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragging.current = true;
  }, [isDragging]);

  function handleOpen() {
    if (wasDragging.current) {
      wasDragging.current = false;
      return;
    }
    onOpen(card.id);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <CardContextMenu card={card} onOpen={onOpen}>
        <CardView card={card} onOpen={handleOpen} />
      </CardContextMenu>
    </div>
  );
}
