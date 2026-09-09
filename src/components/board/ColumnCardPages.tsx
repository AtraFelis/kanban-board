import { useCallback, useEffect, useRef, useState } from "react";
import { useDndMonitor } from "@dnd-kit/core";

interface ColumnCardPagesProps {
  // 페이지로 흘려보낼 카드/섹션 내용. 카드 요소에는 break-inside:avoid가 있어야 한다.
  children: React.ReactNode;
  // 빈 곳 더블클릭 시 카드 추가.
  onAddCard: () => void;
  // 내용이 바뀌면(카드 수·섹션 접힘 등) 값이 달라지는 키. 이때만 페이지 수를 다시 잰다.
  recalcKey: string | number;
  // 카드 드래그 중인지. 드래그 중엔 레이아웃이 요동쳐서 재계산을 멈춘다 (렌더 루프 방지).
  isDragging?: boolean;
}

// 한 번의 휠 제스처(관성 스크롤)로 여러 페이지가 넘어가지 않게 하는 잠금 시간.
const WHEEL_LOCK_MS = 420;
// 드래그 중 커서가 가장자리에서 이만큼 안쪽에 오면 페이지를 넘긴다.
const DRAG_FLIP_EDGE_PX = 48;
// 드래그 중 페이지 넘김 사이 최소 간격.
const DRAG_FLIP_LOCK_MS = 500;

// 컬럼의 카드가 세로로 넘칠 때, 스크롤바 대신 스마트폰 홈화면처럼 가로 페이지로 나눈다.
// CSS 다단(column-width = 뷰포트 폭)으로 내용을 아래로 채우다 넘치면 다음 페이지로 흐르고,
// translateX로 페이지를 밀어 보여준다 (scrollLeft를 안 써서 @dnd-kit 자동 스크롤·onScroll
// 되먹임이 없다 → 위젯 크래시 방지). 페이지 이동: 휠 / 드래그 가장자리 / 하단 점.
export function ColumnCardPages({
  children,
  onAddCard,
  recalcKey,
  isDragging,
}: ColumnCardPagesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const wheelLockUntil = useRef(0);
  const dragFlipLock = useRef(0);
  const recalcRaf = useRef<number | null>(null);

  const goTo = useCallback((next: number, count: number) => {
    if (count <= 1) {
      setPage(0);
      return;
    }
    setPage(((next % count) + count) % count);
  }, []);

  // 페이지 폭·개수를 다시 잰다. 값이 바뀔 때만 상태 갱신(렌더 루프 방지).
  const recalc = useCallback(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || track === null || vp.clientWidth === 0) return;
    const w = vp.clientWidth;
    // track은 다단 내용 전체 폭으로 늘어난다 → 폭 / 뷰포트 = 페이지 수.
    const count = Math.max(1, Math.round(track.scrollWidth / w));
    setPageWidth((prev) => (prev === w ? prev : w));
    setPageCount((prev) => (prev === count ? prev : count));
    setPage((prev) => (prev <= count - 1 ? prev : count - 1));
  }, []);

  const scheduleRecalc = useCallback(() => {
    if (recalcRaf.current != null) cancelAnimationFrame(recalcRaf.current);
    recalcRaf.current = requestAnimationFrame(() => {
      recalcRaf.current = null;
      recalc();
    });
  }, [recalc]);

  // 내용이 바뀌면(드래그 중이 아닐 때만) 재계산. 드래그 종료 시에도 한 번.
  useEffect(() => {
    if (isDragging) return;
    scheduleRecalc();
  }, [recalcKey, isDragging, scheduleRecalc]);

  // 뷰포트 크기 변화 → 재계산.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => scheduleRecalc());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [scheduleRecalc]);

  useEffect(() => {
    return () => {
      if (recalcRaf.current != null) cancelAnimationFrame(recalcRaf.current);
    };
  }, []);

  // 휠: 아래로 → 다음 페이지, 위로 → 이전 (양 끝에서 순환). non-passive라야 preventDefault.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function onWheel(e: WheelEvent) {
      if (pageCount <= 1) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLockUntil.current) return;
      const delta = e.deltaY || e.deltaX;
      if (delta === 0) return;
      wheelLockUntil.current = now + WHEEL_LOCK_MS;
      goTo(page + (delta > 0 ? 1 : -1), pageCount);
    }
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [page, pageCount, goTo]);

  // 드래그 중 커서가 뷰포트 좌/우 가장자리에 닿으면 페이지를 한 장 넘긴다.
  // 항상 페이지 단위로만 이동하므로 "중간에 멈춤" 상태가 없다.
  useDndMonitor({
    onDragMove(event) {
      if (pageCount <= 1) return;
      const vp = viewportRef.current;
      const act = event.activatorEvent;
      if (!vp || !(act instanceof MouseEvent)) return;
      const px = act.clientX + event.delta.x;
      const py = act.clientY + event.delta.y;
      const box = vp.getBoundingClientRect();
      if (py < box.top - 40 || py > box.bottom + 40) return;
      const now = Date.now();
      if (now < dragFlipLock.current) return;
      if (px > box.right - DRAG_FLIP_EDGE_PX && page < pageCount - 1) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page + 1, pageCount);
      } else if (px < box.left + DRAG_FLIP_EDGE_PX && page > 0) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page - 1, pageCount);
      }
    },
    onDragEnd() {
      dragFlipLock.current = 0;
    },
    onDragCancel() {
      dragFlipLock.current = 0;
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={viewportRef}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onAddCard();
        }}
        className="relative min-h-0 flex-1 overflow-hidden"
      >
        <div
          ref={trackRef}
          className="h-full transition-transform duration-200 ease-out"
          style={{
            transform: `translateX(-${page * pageWidth}px)`,
            columnWidth: pageWidth ? `${pageWidth}px` : undefined,
            columnGap: 0,
            columnFill: "auto",
          }}
        >
          {children}
        </div>
      </div>

      {/* 점 영역 높이를 항상 확보 → 점 표시/숨김이 재계산을 요동치게 하지 않는다. */}
      <div className="flex h-4 shrink-0 items-center justify-center gap-1">
        {pageCount > 1 &&
          Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}페이지로`}
              onClick={() => goTo(i, pageCount)}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-4 bg-foreground/70" : "w-1.5 bg-foreground/25"
              }`}
            />
          ))}
      </div>
    </div>
  );
}
