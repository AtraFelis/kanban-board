import type { Card } from "@/types";

interface CardViewProps {
  card: Card;
}

// 컬럼 안에 놓이는 카드 한 장. 상세 편집(클릭 시 패널)은 이후 단계에서 연결한다.
export function CardView({ card }: CardViewProps) {
  const doneCount = card.checklist.filter((item) => item.done).length;
  const hasMeta =
    Boolean(card.dueDate) || card.checklist.length > 0 || card.labels.length > 0;

  return (
    <div className="rounded-md border bg-card p-2 text-sm shadow-xs">
      <p className="font-medium break-words">{card.title}</p>
      {hasMeta && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {card.dueDate && <span>📅 {card.dueDate}</span>}
          {card.checklist.length > 0 && (
            <span>
              ☑ {doneCount}/{card.checklist.length}
            </span>
          )}
          {card.labels.map((label) => (
            <span key={label} className="rounded bg-secondary px-1 py-0.5">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
