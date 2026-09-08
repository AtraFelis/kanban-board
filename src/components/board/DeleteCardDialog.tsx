import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

import { ConfirmDialog } from "./ConfirmDialog";

interface DeleteCardDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 카드 삭제 확인. 우클릭 메뉴와 카드 위 빠른 삭제(x) 버튼이 공유한다.
export function DeleteCardDialog({
  card,
  open,
  onOpenChange,
}: DeleteCardDialogProps) {
  const removeCard = useBoardStore((s) => s.removeCard);

  return (
    <ConfirmDialog
      open={open}
      title="정말 삭제할까요?"
      description={`"${card.title}" 카드가 삭제됩니다.`}
      confirmLabel="확인"
      destructive
      onConfirm={() => {
        removeCard(card.id);
        onOpenChange(false);
      }}
      onCancel={() => onOpenChange(false)}
    />
  );
}
