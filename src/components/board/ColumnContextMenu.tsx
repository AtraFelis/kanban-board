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
import { nextSort, SORT_BY_LABEL, SORT_KEYS } from "@/lib/sortCards";
import type { ColumnSort } from "@/types";

interface ColumnContextMenuProps {
  onAddCard: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDoubleClick: (event: React.MouseEvent) => void;
  children: React.ReactNode;
  // 컬럼 컨테이너 클래스. 풀보드/위젯이 각자 다른 크기감을 준다.
  className?: string;
  // 이 컬럼이 '완료' 컬럼인지, 그리고 지정/해제 콜백. onSetDone 없으면 항목을 숨긴다.
  isDone?: boolean;
  onSetDone?: () => void;
  // 현재 정렬과 변경 콜백. onSetSort 없으면 "정렬" 항목을 숨긴다.
  sort?: ColumnSort;
  onSetSort?: (sort: ColumnSort | null) => void;
  // 컬럼 메뉴 뒤에 덧붙일 항목 (위젯은 여기에 위젯 설정을 넣는다).
  extraItems?: React.ReactNode;
}

// 컬럼의 스타일 컨테이너 겸 우클릭 메뉴(카드 추가 / 이름 변경 / 완료 지정 / 정렬 / 삭제).
// 컬럼 빈 영역 더블클릭은 카드 추가로 연결한다.
export function ColumnContextMenu({
  onAddCard,
  onRename,
  onDelete,
  onDoubleClick,
  children,
  className = "flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-lg bg-muted/50 p-2",
  isDone,
  onSetDone,
  sort,
  onSetSort,
  extraItems,
}: ColumnContextMenuProps) {
  const manualActive = !sort || sort.by === "manual";

  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>
        <div
          onDoubleClick={onDoubleClick}
          // 상위(위젯) 컨텍스트 메뉴로 우클릭이 번지지 않게 한다.
          onContextMenu={(e) => e.stopPropagation()}
          className={className}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onAddCard}>카드 추가</ContextMenuItem>
        <ContextMenuItem onSelect={onRename}>컬럼 이름 변경</ContextMenuItem>
        {onSetDone && (
          <ContextMenuItem onSelect={onSetDone}>
            {isDone ? "✓ 완료 컬럼 (지정 해제)" : "완료 컬럼으로 지정"}
          </ContextMenuItem>
        )}
        {onSetSort && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>정렬</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem onSelect={() => onSetSort(null)}>
                {manualActive ? "✓ 수동" : "수동"}
              </ContextMenuItem>
              {SORT_KEYS.map((by) => {
                const active = sort?.by === by;
                const arrow = active ? (sort.dir === "asc" ? " ↑" : " ↓") : "";
                return (
                  <ContextMenuItem
                    key={by}
                    onSelect={() => onSetSort(nextSort(sort, by))}
                  >
                    {(active ? "✓ " : "") + SORT_BY_LABEL[by] + arrow}
                  </ContextMenuItem>
                );
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onDelete}>
          컬럼 삭제
        </ContextMenuItem>
        {extraItems && (
          <>
            <ContextMenuSeparator />
            {extraItems}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
