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
      {/* 헤더·푸터 고정, 가운데만 스크롤 → 체크리스트가 길어져도 저장/취소가 안 밀린다 */}
      <DialogContent
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-3.5 text-left">
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
    const { createdAt, ...rest } = cardFormToInput(draft);
    // 생성일은 사용자가 실제로 바꿨을 때만 반영한다 (안 그러면 원래 시각 정보가 날아감).
    const changed = draft.createdAt !== cardToForm(card).createdAt;
    updateCard(card.id, changed ? { ...rest, createdAt } : rest);
    onClose();
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <CardFields
          value={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t px-5 py-3">
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
