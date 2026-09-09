import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { ConfirmDialog } from "./ConfirmDialog";

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

  // 저장하지 않은 편집이 있는지. CardEditForm이 매 변경마다 갱신한다.
  const dirtyRef = useRef(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  // 저장/삭제 후처럼 경고 없이 확실히 닫는다.
  function finishClose() {
    dirtyRef.current = false;
    setConfirmDiscard(false);
    onClose();
  }

  // X · 취소 · Esc로 닫으려는 시도. 편집분이 있으면 확인 팝업부터.
  function requestClose() {
    if (dirtyRef.current) {
      setConfirmDiscard(true);
    } else {
      finishClose();
    }
  }

  return (
    <>
      <Dialog
        open={Boolean(cardId)}
        onOpenChange={(next) => {
          if (!next) requestClose();
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
          {card && (
            <CardEditForm
              key={card.id}
              card={card}
              onClose={finishClose}
              onRequestClose={requestClose}
              onDirtyChange={handleDirtyChange}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        title="저장하지 않고 닫을까요?"
        description="편집한 내용이 저장되지 않습니다."
        confirmLabel="닫기"
        cancelLabel="계속 편집"
        destructive
        onConfirm={finishClose}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}

function CardEditForm({
  card,
  onClose,
  onRequestClose,
  onDirtyChange,
}: {
  card: Card;
  onClose: () => void;
  onRequestClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const updateCard = useBoardStore((s) => s.updateCard);
  const removeCard = useBoardStore((s) => s.removeCard);
  // 이 카드가 지금 '완료' 컬럼에 있는지 → "완료일" 입력 노출 여부.
  const isInDoneColumn = useBoardStore((s) => {
    const b = s.board;
    if (!b?.doneColumnId) return false;
    const doneColumn = b.columns.find((c) => c.id === b.doneColumnId);
    return !!doneColumn?.cardIds.includes(card.id);
  });

  const baseForm = useMemo(() => cardToForm(card), [card]);
  const [draft, setDraft] = useState<CardFormValue>(() => baseForm);

  // 원본과 한 글자라도 다르면 dirty. 체크리스트 순서 변경도 포함(배열 순서까지 비교).
  useEffect(() => {
    onDirtyChange(JSON.stringify(draft) !== JSON.stringify(baseForm));
  }, [draft, baseForm, onDirtyChange]);

  function save() {
    if (!draft.title.trim()) return;
    const patch: CardPatch = cardFormToInput(draft);
    // 시작일·완료일은 사용자가 실제로 바꿨을 때만 반영한다 (안 그러면 시각 정보가 날아감).
    if (draft.createdAt === baseForm.createdAt) delete patch.createdAt;
    if (draft.completedAt === baseForm.completedAt) delete patch.completedAt;
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRequestClose}
          >
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
