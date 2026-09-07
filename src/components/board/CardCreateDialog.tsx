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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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
      <CardFields
        value={draft}
        onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
      />
      <div className="flex justify-end gap-2 pt-2">
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
