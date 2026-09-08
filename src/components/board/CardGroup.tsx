interface CardGroupProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  // 섹션 헤더의 이름변경/삭제 버튼 등 (5-3에서 사용). 없으면 안 그린다.
  headerExtra?: React.ReactNode;
}

// 컬럼 안에서 카드를 접이식 그룹으로 묶는 공용 셸.
// 완료 컬럼의 날짜 그룹과 컬럼 카테고리 섹션이 함께 쓴다.
export function CardGroup({
  label,
  count,
  collapsed,
  onToggle,
  children,
  headerExtra,
}: CardGroupProps) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-1 rounded px-1 py-0.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          <span className="w-3 shrink-0">{collapsed ? "▸" : "▾"}</span>
          <span className="truncate">{label}</span>
          <span className="shrink-0 tabular-nums">· {count}</span>
        </button>
        {headerExtra}
      </div>
      {!collapsed && <div className="grid gap-2">{children}</div>}
    </div>
  );
}
