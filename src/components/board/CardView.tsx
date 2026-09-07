import type { Card } from "@/types";

interface CardViewProps {
  card: Card;
  onOpen?: () => void;
}

// 컬럼 안에 놓이는 카드 한 장. 클릭하면 상세 편집 패널을 연다.
export function CardView({ card, onOpen }: CardViewProps) {
  const doneCount = card.checklist.filter((item) => item.done).length;
  const hasMeta =
    Boolean(card.dueDate) || card.checklist.length > 0 || card.labels.length > 0;

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`rounded-md border bg-card p-2 text-sm shadow-xs ${
        onOpen ? "cursor-pointer hover:border-ring" : ""
      }`}
    >
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
