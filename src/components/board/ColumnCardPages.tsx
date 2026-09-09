import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface ColumnCardPagesProps {
  // 페이지로 흘려보낼 카드/섹션 내용. 카드 요소에는 break-inside:avoid가 있어야 한다.
  children: React.ReactNode;
  // 빈 곳 더블클릭 시 카드 추가.
  onAddCard: () => void;
  // 내용이 바뀌면(카드 수·섹션 접힘 등) 값이 달라지는 키. 이때만 페이지 수를 다시 잰다.
  recalcKey: string | number;
  // 카드 드래그 중인지. 드래그 중엔 재계산을 멈춰 렌더 폭주(위젯 크래시)를 막는다.
  isDragging?: boolean;
}

// 한 번의 휠 제스처(관성 스크롤)로 여러 페이지가 넘어가지 않게 하는 잠금 시간.
const WHEEL_LOCK_MS = 420;
// 페이지 전환 애니메이션 길이.
const SCROLL_ANIM_MS = 200;
// 드래그 중 커서가 가장자리에서 이만큼 안쪽에 오면 페이지를 넘긴다.
const DRAG_FLIP_EDGE_PX = 48;
// 드래그 중 페이지 넘김 사이 최소 간격.
const DRAG_FLIP_LOCK_MS = 480;

// scrollLeft를 timer로 트윈한다. scroll-behavior:smooth·rAF가 환경 따라 안 먹어서
// setInterval로 직접 굴린다 (창이 가려져도 동작).
function tweenScrollLeft(
  el: HTMLElement,
  to: number,
  timerRef: { current: ReturnType<typeof setInterval> | null },
) {
  if (timerRef.current) clearInterval(timerRef.current);
  const from = el.scrollLeft;
  const dist = to - from;
  if (Math.abs(dist) < 1) {
    el.scrollLeft = to;
    return;
  }
  const start = Date.now();
  timerRef.current = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / SCROLL_ANIM_MS);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.scrollLeft = from + dist * eased;
    if (t >= 1 && timerRef.current) clearInterval(timerRef.current);
  }, 16);
}

// 컬럼의 카드가 세로로 넘칠 때, 스크롤바 대신 스마트폰 홈화면처럼 가로 페이지로 나눈다.
// CSS 다단(column-width = 컨테이너 폭)으로 채우다 넘치면 다음 페이지로 흐른다.
// 페이지 이동: 휠 / 하단 점 / 드래그 중 커서가 가장자리에 닿으면 — 항상 페이지 단위로만.
// @dnd-kit 자동 스크롤은 BoardColumns에서 이 컨테이너에 대해 끈다(중간 멈춤 = 크래시 방지).
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
  const dragFlipLock = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // 페이지 n으로. count를 인자로 받아 최신값을 쓴다.
  const goTo = useCallback((next: number, count: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const c = Math.max(1, count);
    const wrapped = c <= 1 ? 0 : ((next % c) + c) % c;
    setPage(wrapped);
    tweenScrollLeft(el, wrapped * el.clientWidth, scrollTimer);
  }, []);

  // 페이지 폭·개수를 다시 잰다. 값이 바뀔 때만 상태 갱신(렌더 루프 방지).
  const recalc = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    const w = el.clientWidth;
    const count = Math.max(1, Math.ceil((el.scrollWidth - 1) / w));
    setPageWidth((prev) => (prev === w ? prev : w));
    setPageCount((prev) => (prev === count ? prev : count));
    setPage((prev) => (prev <= count - 1 ? prev : count - 1));
  }, []);

  // 내용 변화 / pageWidth 확정 직후 / 드래그 종료 시 페이지 수 재계산.
  // rAF는 창이 가려지면 멈추므로 동기 실행.
  useLayoutEffect(() => {
    if (isDragging) return;
    recalc();
  }, [recalcKey, pageWidth, isDragging, recalc]);

  // 뷰포트 크기 변화 → 재계산.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!isDragging) recalc();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalc, isDragging]);

  useEffect(() => {
    const timer = scrollTimer;
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  // 드래그가 끝나면 지금 스크롤에서 가장 가까운 페이지로 스냅.
  const wasDragging = useRef(false);
  useEffect(() => {
    if (wasDragging.current && !isDragging) {
      const el = scrollRef.current;
      if (el && el.clientWidth) {
        const p = Math.round(el.scrollLeft / el.clientWidth);
        setPage((cur) => (cur === p ? cur : p));
        tweenScrollLeft(el, p * el.clientWidth, scrollTimer);
      }
      recalc();
    }
    wasDragging.current = !!isDragging;
  }, [isDragging, recalc]);

  // 휠: 아래로 → 다음 페이지, 위로 → 이전 (양 끝에서 순환). non-passive라야 preventDefault.
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
      goTo(page + (delta > 0 ? 1 : -1), pageCount);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [page, pageCount, goTo]);

  // 드래그 중 커서가 컨테이너 좌/우 가장자리에 닿으면 페이지를 한 장 넘긴다.
  // document의 실제 pointermove를 보므로 @dnd-kit 이벤트 주기에 의존하지 않는다.
  useEffect(() => {
    if (!isDragging || pageCount <= 1) return;
    dragFlipLock.current = 0;
    function onPointerMove(e: PointerEvent) {
      const el = scrollRef.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      if (e.clientY < box.top - 40 || e.clientY > box.bottom + 40) return;
      const now = Date.now();
      if (now < dragFlipLock.current) return;
      if (e.clientX > box.right - DRAG_FLIP_EDGE_PX && page < pageCount - 1) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page + 1, pageCount);
      } else if (e.clientX < box.left + DRAG_FLIP_EDGE_PX && page > 0) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page - 1, pageCount);
      }
    }
    document.addEventListener("pointermove", onPointerMove, true);
    return () => document.removeEventListener("pointermove", onPointerMove, true);
  }, [isDragging, page, pageCount, goTo]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollRef}
        data-column-pages
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onAddCard();
        }}
        // overflow-x:auto — @dnd-kit이 이 스크롤을 추적해 페이지 넘긴 뒤 드롭 대상
        // 좌표를 다시 잰다. 스크롤바만 숨긴다. 자동 스크롤은 BoardColumns에서 끈다.
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={
          pageWidth
            ? { columnWidth: `${pageWidth}px`, columnGap: 0, columnFill: "auto" }
            : undefined
        }
      >
        {children}
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
