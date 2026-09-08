import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

interface DeleteCardDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 카드 삭제 확인 다이얼로그. 우클릭 메뉴와 카드 위 빠른 삭제(x) 버튼이 공유한다.
export function DeleteCardDialog({
  card,
  open,
  onOpenChange,
}: DeleteCardDialogProps) {
  const removeCard = useBoardStore((s) => s.removeCard);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>정말 삭제할까요?</DialogTitle>
        </DialogHeader>
        <p className="text-sm wrap-anywhere text-muted-foreground">
          &ldquo;{card.title}&rdquo; 카드가 삭제됩니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => {
              removeCard(card.id);
              onOpenChange(false);
            }}
          >
            확인
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
