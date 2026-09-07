import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

interface CardContextMenuProps {
  card: Card;
  onOpen: (cardId: string) => void;
  children: React.ReactNode;
}

// 카드 우클릭 메뉴: 수정 / 이동(다른 컬럼) / 삭제(확인 후).
export function CardContextMenu({ card, onOpen, children }: CardContextMenuProps) {
  const columns = useBoardStore((s) => s.board?.columns);
  const moveCard = useBoardStore((s) => s.moveCard);
  const removeCard = useBoardStore((s) => s.removeCard);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const currentColumnId = columns?.find((c) =>
    c.cardIds.includes(card.id),
  )?.id;
  const moveTargets = (columns ?? []).filter((c) => c.id !== currentColumnId);

  return (
    <>
      {/* modal={false}: 메뉴가 body pointer-events를 잠그지 않아 삭제 확인 다이얼로그와 충돌하지 않음 */}
      <ContextMenu modal={false}>
        {/* asChild 대상은 ref·props를 그대로 받는 순수 div여야 한다 (CardView는 아님) */}
        <ContextMenuTrigger asChild>
          <div onContextMenu={(e) => e.stopPropagation()}>{children}</div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onOpen(card.id)}>수정</ContextMenuItem>

          {moveTargets.length > 0 && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>이동</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {moveTargets.map((column) => (
                  <ContextMenuItem
                    key={column.id}
                    onSelect={() =>
                      moveCard(card.id, column.id, column.cardIds.length)
                    }
                  >
                    {column.title}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>정말 삭제할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-sm break-words text-muted-foreground">
            &ldquo;{card.title}&rdquo; 카드가 삭제됩니다.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                removeCard(card.id);
                setConfirmOpen(false);
              }}
            >
              확인
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
