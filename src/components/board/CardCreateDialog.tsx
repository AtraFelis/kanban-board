import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoardStore } from "@/store/boardStore";

import { CardFields } from "./CardFields";
import { cardFormToInput, emptyCardForm, type CardFormValue } from "./cardForm";

interface CardCreateDialogProps {
  columnId: string | null;
  onClose: () => void;
}

// 상세 카드 추가. 빈 초안을 채워 "추가"하면 해당 컬럼에 카드가 생성된다.
// 폼 본체는 columnId로 key를 걸어 다른 컬럼에서 열면 새로 마운트된다.
export function CardCreateDialog({ columnId, onClose }: CardCreateDialogProps) {
  return (
    <Dialog
      open={Boolean(columnId)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      {/* 헤더·푸터 고정, 가운데만 스크롤 → 내용이 길어져도 추가/취소가 안 밀린다 */}
      <DialogContent
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-3.5 text-left">
          <DialogTitle>카드 추가</DialogTitle>
        </DialogHeader>
        {columnId && (
          <CardCreateForm key={columnId} columnId={columnId} onClose={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CardCreateForm({
  columnId,
  onClose,
}: {
  columnId: string;
  onClose: () => void;
}) {
  const addCard = useBoardStore((s) => s.addCard);
  const [draft, setDraft] = useState<CardFormValue>(emptyCardForm);

  function submit() {
    if (!draft.title.trim()) return;
    addCard(columnId, cardFormToInput(draft));
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

      <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={!draft.title.trim()}
        >
          추가
        </Button>
      </div>
    </>
  );
}
