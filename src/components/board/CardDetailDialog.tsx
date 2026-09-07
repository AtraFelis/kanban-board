import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

interface CardDetailDialogProps {
  cardId: string | null;
  onClose: () => void;
}

// 카드 상세 편집 패널. 폼 본체는 card.id로 key를 걸어 다른 카드를 열면 새로 마운트된다.
export function CardDetailDialog({ cardId, onClose }: CardDetailDialogProps) {
  const card = useBoardStore((s) =>
    cardId ? (s.board?.cards[cardId] ?? null) : null,
  );

  return (
    <Dialog
      open={Boolean(cardId)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>카드 편집</DialogTitle>
        </DialogHeader>
        {card && <CardDetailForm key={card.id} card={card} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CardDetailForm({
  card,
  onClose,
}: {
  card: Card;
  onClose: () => void;
}) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const removeCard = useBoardStore((s) => s.removeCard);
  const addChecklistItem = useBoardStore((s) => s.addChecklistItem);
  const toggleChecklistItem = useBoardStore((s) => s.toggleChecklistItem);
  const removeChecklistItem = useBoardStore((s) => s.removeChecklistItem);

  // 제목·설명은 타이핑마다 스토어를 건드리지 않고 blur 시점에 반영한다.
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [descDraft, setDescDraft] = useState(card.description ?? "");
  const [labelDraft, setLabelDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== card.title) updateCard(card.id, { title: trimmed });
    else setTitleDraft(card.title);
  }

  function commitDescription() {
    const value = descDraft.trim();
    if (value !== (card.description ?? "")) {
      updateCard(card.id, { description: value || undefined });
    }
  }

  function addLabel() {
    const value = labelDraft.trim();
    setLabelDraft("");
    if (!value || card.labels.includes(value)) return;
    updateCard(card.id, { labels: [...card.labels, value] });
  }

  function removeLabel(label: string) {
    updateCard(card.id, { labels: card.labels.filter((l) => l !== label) });
  }

  function submitChecklistItem() {
    const value = checklistDraft.trim();
    if (!value) return;
    addChecklistItem(card.id, value);
    setChecklistDraft("");
  }

  const doneCount = card.checklist.filter((i) => i.done).length;

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">제목</span>
        <Input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">설명</span>
        <Textarea
          value={descDraft}
          onChange={(e) => setDescDraft(e.target.value)}
          onBlur={commitDescription}
          rows={3}
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">마감일</span>
        <Input
          type="date"
          value={card.dueDate ?? ""}
          onChange={(e) =>
            updateCard(card.id, { dueDate: e.target.value || undefined })
          }
          className="w-44"
        />
      </label>

      <div className="grid gap-1 text-sm">
        <span className="font-medium">라벨</span>
        {card.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {card.labels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => removeLabel(label)}
                className="rounded bg-secondary px-1.5 py-0.5 text-xs hover:line-through"
                title="클릭하면 제거"
              >
                {label} ✕
              </button>
            ))}
          </div>
        )}
        <Input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLabel();
            }
          }}
          onBlur={addLabel}
          placeholder="라벨 입력 후 Enter"
          className="h-8"
        />
      </div>

      <div className="grid gap-1 text-sm">
        <span className="font-medium">
          체크리스트{" "}
          <span className="font-normal text-muted-foreground">
            {doneCount}/{card.checklist.length}
          </span>
        </span>
        <ul className="grid gap-1">
          {card.checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleChecklistItem(card.id, item.id)}
              />
              <span
                className={
                  item.done
                    ? "flex-1 text-muted-foreground line-through"
                    : "flex-1"
                }
              >
                {item.text}
              </span>
              <button
                type="button"
                onClick={() => removeChecklistItem(card.id, item.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <Input
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitChecklistItem();
              }
            }}
            placeholder="+ 항목 추가"
            className="h-8"
          />
          <Button
            type="button"
            size="sm"
            onClick={submitChecklistItem}
            disabled={!checklistDraft.trim()}
          >
            추가
          </Button>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => {
            removeCard(card.id);
            onClose();
          }}
        >
          카드 삭제
        </Button>
        <Button type="button" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
