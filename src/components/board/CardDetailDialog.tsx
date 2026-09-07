import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

import { CardFields } from "./CardFields";
import { cardFormToInput, cardToForm, type CardFormValue } from "./cardForm";

interface CardDetailDialogProps {
  cardId: string | null;
  onClose: () => void;
}

// 카드 상세 편집. 초안을 잡고 "저장"에서 한 번에 반영, "취소"로 폐기한다.
// 폼 본체는 card.id로 key를 걸어 다른 카드를 열면 새로 마운트된다.
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
        {card && <CardEditForm key={card.id} card={card} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CardEditForm({ card, onClose }: { card: Card; onClose: () => void }) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const removeCard = useBoardStore((s) => s.removeCard);

  const [draft, setDraft] = useState<CardFormValue>(() => cardToForm(card));

  function save() {
    if (!draft.title.trim()) return;
    updateCard(card.id, cardFormToInput(draft));
    onClose();
  }

  return (
    <>
      <CardFields
        value={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
      />

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
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!draft.title.trim()}
          >
            저장
          </Button>
        </div>
      </div>
    </>
  );
}
