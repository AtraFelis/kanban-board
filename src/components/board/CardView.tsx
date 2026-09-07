import { useState } from "react";

import { dueColorClass, dueStatus } from "@/lib/date";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

import { DeleteCardDialog } from "./DeleteCardDialog";

interface CardViewProps {
  card: Card;
  onOpen?: () => void;
}

// 설명이 이보다 길거나 줄 수가 많으면 카드에서는 접고 "더보기"로 펼친다.
const DESC_PREVIEW_CHARS = 100;
const DESC_PREVIEW_LINES = 3;
// 체크리스트가 이 개수를 넘으면 카드에서는 접고 드롭다운으로 펼친다.
const CHECKLIST_PREVIEW_LIMIT = 3;

// 컬럼 안에 놓이는 카드 한 장. 클릭하면 상세 편집 패널을 연다.
// 설명·체크리스트는 카드에서 바로 보이되, 길면 접어서 클릭 시에만 전체를 보여준다.
export function CardView({ card, onOpen }: CardViewProps) {
  const updateCard = useBoardStore((s) => s.updateCard);

  const [descOpen, setDescOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const doneCount = card.checklist.filter((item) => item.done).length;
  const due = dueStatus(card.dueDate);

  const description = card.description?.trim() ?? "";
  const descLong =
    description.length > DESC_PREVIEW_CHARS ||
    description.split("\n").length > DESC_PREVIEW_LINES;

  const listLong = card.checklist.length > CHECKLIST_PREVIEW_LIMIT;
  const showItems = !listLong || listOpen;

  const hasBottomMeta = Boolean(card.dueDate) || card.labels.length > 0;

  // 카드 내부의 컨트롤(펼침 토글·체크박스·삭제)이 카드 클릭(편집창 열기)이나
  // dnd-kit 드래그 시작(pointerdown)으로 번지지 않게 막는다.
  function stopBubble(e: React.SyntheticEvent) {
    e.stopPropagation();
  }

  function toggleItem(itemId: string) {
    updateCard(card.id, {
      checklist: card.checklist.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i,
      ),
    });
  }

  function deleteItem(itemId: string) {
    updateCard(card.id, {
      checklist: card.checklist.filter((i) => i.id !== itemId),
    });
  }

  return (
    // group: 호버 시 삭제 버튼 노출. 삭제 확인 다이얼로그는 클릭 가능한 카드 div의
    // 바깥(형제)에 두어야 한다 — React 포털은 이벤트가 컴포넌트 트리를 타고 올라가
    // 카드 안에 있으면 다이얼로그 클릭이 카드 열기로 새어나간다.
    <div className="group">
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
        style={card.color ? { backgroundColor: card.color } : undefined}
        className={`rounded-md border bg-card p-2 text-sm shadow-xs ${
          due === "overdue"
            ? "border-l-2 border-l-destructive"
            : due === "soon"
              ? "border-l-2 border-l-amber-500"
              : ""
        } ${onOpen ? "cursor-pointer hover:border-ring" : ""}`}
      >
        <div className="flex items-start gap-1.5">
          <p className="flex-1 font-medium break-words">{card.title}</p>
          {card.checklist.length > 0 && (
            <span className="mt-px shrink-0 text-xs text-muted-foreground tabular-nums">
              {doneCount}/{card.checklist.length}
            </span>
          )}
          {onOpen && (
            <button
              type="button"
              aria-label="카드 삭제"
              onPointerDown={stopBubble}
              onKeyDown={stopBubble}
              onClick={(e) => {
                stopBubble(e);
                setConfirmDelete(true);
              }}
              className="-mr-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100"
            >
              ✕
            </button>
          )}
        </div>

        {description && (
          <>
            <p
              className={`mt-1 text-xs break-words whitespace-pre-wrap text-muted-foreground ${
                descLong && !descOpen ? "line-clamp-3" : ""
              }`}
            >
              {description}
            </p>
            {descLong && (
              <button
                type="button"
                onPointerDown={stopBubble}
                onKeyDown={stopBubble}
                onClick={(e) => {
                  stopBubble(e);
                  setDescOpen((v) => !v);
                }}
                className="mt-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {descOpen ? "설명 접기 ▾" : "설명 더보기 ▸"}
              </button>
            )}
          </>
        )}

        {card.checklist.length > 0 && (
          <div className="mt-1.5">
            {listLong && (
              <button
                type="button"
                onPointerDown={stopBubble}
                onKeyDown={stopBubble}
                onClick={(e) => {
                  stopBubble(e);
                  setListOpen((v) => !v);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <span>{listOpen ? "▾" : "▸"}</span>
                <span>체크리스트</span>
              </button>
            )}

            {showItems && (
              <ul className={`grid gap-0.5 ${listLong ? "mt-1" : ""}`}>
                {card.checklist.map((item) => (
                  <li
                    key={item.id}
                    className="group/item flex items-start gap-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      aria-label={item.text}
                      onPointerDown={stopBubble}
                      onClick={stopBubble}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 size-3.5 shrink-0"
                    />
                    <span
                      className={`flex-1 break-words ${
                        item.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground/80"
                      }`}
                    >
                      {item.text}
                    </span>
                    {onOpen && (
                      <button
                        type="button"
                        aria-label="항목 삭제"
                        onPointerDown={stopBubble}
                        onKeyDown={stopBubble}
                        onClick={(e) => {
                          stopBubble(e);
                          deleteItem(item.id);
                        }}
                        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hasBottomMeta && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {card.dueDate && (
              <span className={dueColorClass(due)}>📅 {card.dueDate}</span>
            )}
            {card.labels.map((label) => (
              <span key={label} className="rounded bg-secondary px-1 py-0.5">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {onOpen && (
        <DeleteCardDialog
          card={card}
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
        />
      )}
    </div>
  );
}
