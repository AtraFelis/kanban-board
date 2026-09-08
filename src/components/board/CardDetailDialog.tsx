import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type CardPatch, useBoardStore } from "@/store/boardStore";
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
  // 이 카드가 지금 '완료' 컬럼에 있는지 → "완료일" 입력 노출 여부.
  const isInDoneColumn = useBoardStore((s) => {
    const b = s.board;
    if (!b?.doneColumnId) return false;
    const doneColumn = b.columns.find((c) => c.id === b.doneColumnId);
    return !!doneColumn?.cardIds.includes(card.id);
  });

  const [draft, setDraft] = useState<CardFormValue>(() => cardToForm(card));

  function save() {
    if (!draft.title.trim()) return;
    const base = cardToForm(card);
    const patch: CardPatch = cardFormToInput(draft);
    // 시작일·완료일은 사용자가 실제로 바꿨을 때만 반영한다 (안 그러면 시각 정보가 날아감).
    if (draft.createdAt === base.createdAt) delete patch.createdAt;
    if (draft.completedAt === base.completedAt) delete patch.completedAt;
    updateCard(card.id, patch);
    onClose();
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <CardFields
          value={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          showCompletedAt={isInDoneColumn}
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
