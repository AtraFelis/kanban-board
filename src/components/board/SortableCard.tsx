import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Card } from "@/types";

import { CardView } from "./CardView";

interface SortableCardProps {
  card: Card;
}

// CardView를 @dnd-kit sortable 아이템으로 감싼다.
export function SortableCard({ card }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card" } });

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
      <CardView card={card} />
    </div>
  );
}
