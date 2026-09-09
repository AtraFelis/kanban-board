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
const WHEEL_LOCK_MS = 450;
// 페이지 전환 애니메이션 길이.
const SCROLL_ANIM_MS = 240;
// 드래그 중 커서가 가장자리에서 이만큼 안쪽에 오면 페이지를 넘긴다.
const DRAG_FLIP_EDGE_PX = 44;
// 드래그 중 페이지 넘김 사이 최소 간격.
const DRAG_FLIP_LOCK_MS = 550;

// 컬럼의 카드가 세로로 넘칠 때, 스크롤바 대신 스마트폰 홈화면처럼 가로 페이지로 나눈다.
// CSS 다단(column-width = 컨테이너 폭)으로 내용을 아래로 채우다 넘치면 오른쪽 페이지로 흐른다.
// 휠 아래로 = 다음 페이지, 위로 = 이전 페이지 (양 끝에서 순환). 하단에 페이지 점 표시.
export function ColumnCardPages({
  children,
  onAddCard,
  recalcKey,
  isDragging,
}: ColumnCardPagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const wheelLockUntil = useRef(0);
  // 진행 중인 스크롤 애니메이션 타이머 / 재계산 예약.
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recalcRaf = useRef<number | null>(null);

  // scrollLeft를 timer로 트윈한다 (scroll-behavior:smooth·rAF가 환경 따라 안 먹어서).
  const animateScrollLeft = useCallback((to: number) => {
    const el = scrollRef.current;
    if (!el) return;
    if (scrollTimer.current) clearInterval(scrollTimer.current);
    const from = el.scrollLeft;
    const dist = to - from;
    if (Math.abs(dist) < 1) {
      el.scrollLeft = to;
      return;
    }
    const start = Date.now();
    scrollTimer.current = setInterval(() => {
      const node = scrollRef.current;
      if (!node) {
        if (scrollTimer.current) clearInterval(scrollTimer.current);
        return;
      }
      const t = Math.min(1, (Date.now() - start) / SCROLL_ANIM_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      node.scrollLeft = from + dist * eased;
      if (t >= 1 && scrollTimer.current) clearInterval(scrollTimer.current);
    }, 16);
  }, []);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollRef.current;
      if (!el || pageCount <= 1) return;
      const wrapped = ((next % pageCount) + pageCount) % pageCount;
      setPage(wrapped);
      animateScrollLeft(wrapped * el.clientWidth);
    },
    [pageCount, animateScrollLeft],
  );

  // 드래그 중 커서가 컨테이너 좌/우 가장자리에 닿으면 페이지를 넘긴다.
  // (@dnd-kit 자동 스크롤은 overflow:hidden이라 안 먹으므로 직접 처리 —
  //  항상 페이지 단위로만 이동해 "중간에 멈춤" 상태를 만들지 않는다.)
  const dragFlipLock = useRef(0);
  useDndMonitor({
    onDragMove(event) {
      if (pageCount <= 1) return;
      const el = scrollRef.current;
      const act = event.activatorEvent;
      if (!el || !(act instanceof MouseEvent)) return;
      const px = act.clientX + event.delta.x;
      const py = act.clientY + event.delta.y;
      const box = el.getBoundingClientRect();
      // 커서가 이 컨테이너 세로 범위 안에 있을 때만.
      if (py < box.top || py > box.bottom) return;
      const now = Date.now();
      if (now < dragFlipLock.current) return;
      if (px > box.right - DRAG_FLIP_EDGE_PX && page < pageCount - 1) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page + 1);
      } else if (px < box.left + DRAG_FLIP_EDGE_PX && page > 0) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page - 1);
      }
    },
    onDragEnd() {
      dragFlipLock.current = 0;
    },
    onDragCancel() {
      dragFlipLock.current = 0;
    },
  });

  // 페이지 폭·개수를 다시 잰다. 상태는 값이 바뀔 때만 갱신하고(렌더 루프 방지),
  // 스크롤 위치 보정은 DOM에 직접 쓴다.
  const recalc = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const w = el.clientWidth;
    // 1px이라도 넘치면 다음 페이지가 있는 것 → ceil. (-1은 sub-pixel 흔들림 방지)
    const count = Math.max(1, Math.ceil((el.scrollWidth - 1) / w));
    setPageWidth((prev) => (prev === w ? prev : w));
    setPageCount((prev) => (prev === count ? prev : count));
    setPage((prev) => (prev <= count - 1 ? prev : count - 1));
    const maxLeft = (count - 1) * w;
    if (el.scrollLeft > maxLeft + 1) el.scrollLeft = maxLeft;
  }, []);

  const scheduleRecalc = useCallback(() => {
    if (recalcRaf.current != null) cancelAnimationFrame(recalcRaf.current);
    recalcRaf.current = requestAnimationFrame(() => {
      recalcRaf.current = null;
      recalc();
    });
  }, [recalc]);

  // 내용이 바뀌면(드래그 중이 아닐 때만) 재계산 예약.
  useEffect(() => {
    if (isDragging) return;
    scheduleRecalc();
  }, [recalcKey, isDragging, scheduleRecalc]);

  // 드래그가 끝나면 현재 페이지 위치로 스냅 + 재계산. (드래그 도중 스크롤이
  // 어긋났거나 카드 수가 바뀌었을 수 있음)
  const wasDragging = useRef(false);
  useEffect(() => {
    if (wasDragging.current && !isDragging) {
      const el = scrollRef.current;
      if (el && el.clientWidth) el.scrollLeft = page * el.clientWidth;
      scheduleRecalc();
    }
    wasDragging.current = !!isDragging;
  }, [isDragging, page, scheduleRecalc]);

  // 컨테이너 크기 변화 → 재계산 예약.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => scheduleRecalc());
    ro.observe(el);
    return () => ro.disconnect();
  }, [scheduleRecalc]);

  // 언마운트 정리.
  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearInterval(scrollTimer.current);
      if (recalcRaf.current != null) cancelAnimationFrame(recalcRaf.current);
    };
  }, []);

  // 자유 스크롤(트랙패드 등)로 페이지가 바뀌면 점 표시를 맞춘다.
  function syncPageFromScroll() {
    if (isDragging) return; // 드래그 중 스크롤 이벤트로 상태를 건드리지 않는다
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    if (Date.now() < wheelLockUntil.current) return; // 휠 애니메이션 중엔 무시
    const p = Math.round(el.scrollLeft / el.clientWidth);
    setPage((cur) => (cur === p ? cur : p));
  }

  // 휠: 아래로 → 다음, 위로 → 이전. non-passive 리스너라야 preventDefault 가능.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (pageCount <= 1) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLockUntil.current) return;
      const delta = e.deltaY || e.deltaX;
      if (delta === 0) return;
      wheelLockUntil.current = now + WHEEL_LOCK_MS;
      goTo(page + (delta > 0 ? 1 : -1));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [page, pageCount, goTo]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        onScroll={syncPageFromScroll}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onAddCard();
        }}
        // overflow-x:hidden — 드래그 중 @dnd-kit 자동 스크롤이 이 컨테이너를 페이지
        // 중간에 멈춰 세우지 못하게 한다. 페이지 이동은 전적으로 goTo()가 담당
        // (scrollLeft 직접 대입은 overflow:hidden에서도 먹는다).
        className="min-h-0 flex-1 overflow-hidden"
        style={
          pageWidth
            ? { columnWidth: `${pageWidth}px`, columnGap: 0 }
            : undefined
        }
      >
        {children}
      </div>

      {/* 점 영역 높이를 항상 확보한다. 점 표시/숨김이 컨테이너 높이를 바꿔
          페이지 수 재계산이 요동치는 것(위젯 크래시)을 막는다. */}
      <div className="flex h-4 shrink-0 items-center justify-center gap-1">
        {pageCount > 1 &&
          Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}페이지로`}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-4 bg-foreground/70" : "w-1.5 bg-foreground/25"
              }`}
            />
          ))}
      </div>
    </div>
  );
}
