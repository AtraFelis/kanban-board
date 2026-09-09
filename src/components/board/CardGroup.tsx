interface CardGroupProps {
  // 문자열이면 클릭 시 접기/펼치기 토글 버튼으로 렌더. 노드면 그대로 둔다(예: 이름 편집 인풋).
  label: React.ReactNode;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onLabelDoubleClick?: () => void;
  children: React.ReactNode;
  // 헤더 오른쪽에 붙일 버튼들 (섹션 이름변경/삭제 등).
  headerExtra?: React.ReactNode;
}

// 컬럼 안에서 카드를 접이식 그룹으로 묶는 공용 셸.
// 완료 컬럼의 날짜 그룹과 컬럼 카테고리 섹션이 함께 쓴다.
export function CardGroup({
  label,
  count,
  collapsed,
  onToggle,
  onLabelDoubleClick,
  children,
  headerExtra,
}: CardGroupProps) {
  return (
    // 블록 흐름 + margin: 컬럼 가로 페이지(CSS 다단)에서 섹션 카드가 페이지를 넘어
    // 이어질 수 있게 (grid/flex는 다단에서 조각나지 않는다).
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1 text-xs font-medium break-inside-avoid text-muted-foreground">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "펼치기" : "접기"}
          className="shrink-0 rounded px-0.5 hover:bg-accent hover:text-foreground"
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {typeof label === "string" ? (
            <button
              type="button"
              onClick={onToggle}
              onDoubleClick={onLabelDoubleClick}
              className="min-w-0 truncate rounded px-1 py-0.5 text-left hover:bg-accent hover:text-foreground"
            >
              {label}
            </button>
          ) : (
            <div className="min-w-0 flex-1">{label}</div>
          )}
          <span className="shrink-0 tabular-nums">· {count}</span>
        </div>
        {headerExtra}
      </div>
      {!collapsed && <div className="space-y-2">{children}</div>}
    </div>
  );
}
