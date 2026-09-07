import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ColumnContextMenuProps {
  onAddCard: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDoubleClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
}

// 컬럼의 스타일 컨테이너 겸 우클릭 메뉴(카드 추가 / 이름 변경 / 삭제).
// 컬럼 빈 영역 더블클릭은 카드 추가로 연결한다.
export function ColumnContextMenu({
  onAddCard,
  onRename,
  onDelete,
  onDoubleClick,
  children,
}: ColumnContextMenuProps) {
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <div
          onDoubleClick={onDoubleClick}
          className="flex h-full min-w-[260px] flex-1 flex-col gap-2 rounded-lg bg-muted/50 p-2"
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onAddCard}>카드 추가</ContextMenuItem>
        <ContextMenuItem onSelect={onRename}>컬럼 이름 변경</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          컬럼 삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
