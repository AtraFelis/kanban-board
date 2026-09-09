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
}

// 한 번의 휠 제스처(관성 스크롤)로 여러 페이지가 넘어가지 않게 하는 잠금 시간.
const WHEEL_LOCK_MS = 450;
// 페이지 전환 애니메이션 길이.
const SCROLL_ANIM_MS = 240;

// scrollLeft를 timer로 트윈한다. scroll-behavior:smooth·rAF가 환경에 따라 안 먹어서
// setInterval로 직접 굴린다 (백그라운드 탭에서도 동작).
function animateScrollLeft(el: HTMLElement, to: number) {
  const from = el.scrollLeft;
  const dist = to - from;
  if (Math.abs(dist) < 1) {
    el.scrollLeft = to;
    return;
  }
  const start = Date.now();
  const timer = setInterval(() => {
    const t = Math.min(1, (Date.now() - start) / SCROLL_ANIM_MS);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.scrollLeft = from + dist * eased;
    if (t >= 1) clearInterval(timer);
  }, 16);
}

// 컬럼의 카드가 세로로 넘칠 때, 스크롤바 대신 스마트폰 홈화면처럼 가로 페이지로 나눈다.
// CSS 다단(column-width = 컨테이너 폭)으로 내용을 아래로 채우다 넘치면 오른쪽 페이지로 흐른다.
// 휠 아래로 = 다음 페이지, 위로 = 이전 페이지 (양 끝에서 순환). 하단에 페이지 점 표시.
export function ColumnCardPages({ children, onAddCard }: ColumnCardPagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(0);
  const wheelLockUntil = useRef(0);

  const goTo = useCallback(
    (next: number) => {
      const el = scrollRef.current;
      if (!el || pageCount <= 1) return;
      const wrapped = ((next % pageCount) + pageCount) % pageCount;
      setPage(wrapped);
      animateScrollLeft(el, wrapped * el.clientWidth);
    },
    [pageCount],
  );

  const recalc = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setPageWidth(el.clientWidth);
    const count = Math.max(1, Math.round(el.scrollWidth / el.clientWidth));
    setPageCount(count);
    setPage((p) => {
      const clamped = Math.min(p, count - 1);
      if (clamped !== p) el.scrollTo({ left: clamped * el.clientWidth });
      return clamped;
    });
  }, []);

  // 자유 스크롤(트랙패드 등)로 페이지가 바뀌면 점 표시를 맞춘다.
  function syncPageFromScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    if (Date.now() < wheelLockUntil.current) return; // 휠 애니메이션 중엔 무시
    const p = Math.round(el.scrollLeft / el.clientWidth);
    setPage((cur) => (cur === p ? cur : p));
  }

  // 컨테이너 크기 변화 → 페이지 폭·개수 재계산.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalc]);

  // 내용(카드 수·섹션 접힘 등)이 바뀌면 렌더 후 페이지 개수 재계산.
  useLayoutEffect(() => {
    recalc();
  });

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
        // overflow-x:auto라야 부드러운 scrollTo가 먹는다. 스크롤바는 숨긴다.
        className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={
          pageWidth
            ? { columnWidth: `${pageWidth}px`, columnGap: 0 }
            : undefined
        }
      >
        {children}
      </div>

      {pageCount > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-1 pt-1">
          {Array.from({ length: pageCount }, (_, i) => (
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
      )}
    </div>
  );
}
