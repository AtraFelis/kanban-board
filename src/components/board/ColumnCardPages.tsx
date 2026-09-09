import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useDndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { Card } from "@/types";

import { SortableCard } from "./SortableCard";

interface ColumnCardPagesProps {
  cards: Card[];
  onOpenCard: (cardId: string) => void;
  // 빈 곳 더블클릭 시 카드 추가.
  onAddCard: () => void;
  // 내용이 바뀌면(카드 수 등) 값이 달라지는 키. 이때만 페이지를 다시 나눈다.
  recalcKey: string | number;
  // 카드 드래그 중인지. 드래그 중엔 페이지 재분할을 멈춘다
  // (카드가 다른 page div로 옮겨가며 remount되면 드래그가 끊긴다).
  isDragging?: boolean;
}

const CARD_GAP = 8; // gap-2
const EST_CARD_HEIGHT = 76;
const WHEEL_LOCK_MS = 420;
const DRAG_FLIP_EDGE_PX = 48;
const DRAG_FLIP_LOCK_MS = 480;

// 컬럼의 카드가 세로로 넘칠 때, 스크롤바 대신 스마트폰 홈화면처럼 가로 페이지로 나눈다.
// CSS 다단 대신 JS로 카드 높이를 재서 페이지에 나눠 담고(각 페이지는 별도 flex 컬럼),
// track을 translateX로 밀어 보여준다. (CSS 다단은 큰 카드 + 드래그에서 렌더러가 크래시)
// 페이지 이동: 휠 / 하단 점 / 드래그 중 커서가 가장자리에 닿으면 — 항상 페이지 단위.
export function ColumnCardPages({
  cards,
  onOpenCard,
  onAddCard,
  recalcKey,
  isDragging,
}: ColumnCardPagesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cardNodes = useRef(new Map<string, HTMLElement>());
  // 각 페이지가 시작하는 cards 인덱스. [0]이면 한 페이지.
  const [pageStarts, setPageStarts] = useState<number[]>([0]);
  const [page, setPage] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  const wheelLockUntil = useRef(0);
  const dragFlipLock = useRef(0);

  const { droppableContainers, measureDroppableContainers } = useDndContext();

  const pageCount = pageStarts.length;

  const setCardNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardNodes.current.set(id, el);
    else cardNodes.current.delete(id);
  }, []);

  const goTo = useCallback((next: number, count: number) => {
    const c = Math.max(1, count);
    setPage(c <= 1 ? 0 : ((next % c) + c) % c);
  }, []);

  // 카드 높이를 재서 페이지 경계를 계산. 값이 바뀔 때만 상태를 갱신한다(렌더 루프 방지).
  const rechunk = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const h = vp.clientHeight;
    const w = vp.clientWidth;
    if (h < 80 || w < 120) return; // 리사이즈 순간의 이상값 무시
    setViewportW((prev) => (prev === w ? prev : w));

    const starts = [0];
    let acc = 0;
    for (let i = 0; i < cards.length; i++) {
      const node = cardNodes.current.get(cards[i].id);
      const ch = node ? node.offsetHeight : EST_CARD_HEIGHT;
      const isFirstOfPage = i === starts[starts.length - 1];
      if (!isFirstOfPage && acc + ch > h) {
        starts.push(i);
        acc = 0;
      }
      acc += ch + CARD_GAP;
    }
    setPageStarts((prev) =>
      prev.length === starts.length && prev.every((v, k) => v === starts[k])
        ? prev
        : starts,
    );
    setPage((p) => (p <= starts.length - 1 ? p : starts.length - 1));
  }, [cards]);

  // 내용/뷰포트 변화 시 재분할. rAF는 창이 가려지면 멈추므로 동기 실행.
  useLayoutEffect(() => {
    if (isDragging) return;
    rechunk();
  }, [recalcKey, viewportW, isDragging, rechunk]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => {
      if (!isDragging) rechunk();
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [rechunk, isDragging]);

  // 드래그 중 페이지가 넘어가면 translateX가 반영된 새 위치로 @dnd-kit이 드롭 대상을
  // 다시 재도록 한다 (transform 변화는 스크롤처럼 자동 감지되지 않음).
  useEffect(() => {
    if (!isDragging) return;
    const remeasure = () =>
      measureDroppableContainers([...droppableContainers.keys()]);
    remeasure();
    const t = setTimeout(remeasure, 0);
    return () => clearTimeout(t);
  }, [page, isDragging, droppableContainers, measureDroppableContainers]);

  // 휠: 아래로 → 다음 페이지, 위로 → 이전 (양 끝 순환).
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

  // 드래그 중 커서가 좌/우 가장자리 근처에 오면 페이지를 한 장 넘긴다.
  useEffect(() => {
    if (!isDragging || pageCount <= 1) return;
    dragFlipLock.current = 0;
    function onPointerMove(e: PointerEvent) {
      const vp = viewportRef.current;
      if (!vp) return;
      const b = vp.getBoundingClientRect();
      const M = 80;
      if (e.clientY < b.top - M || e.clientY > b.bottom + M) return;
      if (e.clientX < b.left - M || e.clientX > b.right + M) return;
      const now = Date.now();
      if (now < dragFlipLock.current) return;
      if (e.clientX > b.right - DRAG_FLIP_EDGE_PX && page < pageCount - 1) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page + 1, pageCount);
      } else if (e.clientX < b.left + DRAG_FLIP_EDGE_PX && page > 0) {
        dragFlipLock.current = now + DRAG_FLIP_LOCK_MS;
        goTo(page - 1, pageCount);
      }
    }
    document.addEventListener("pointermove", onPointerMove, true);
    return () => document.removeEventListener("pointermove", onPointerMove, true);
  }, [isDragging, page, pageCount, goTo]);

  const pages: Card[][] = pageStarts.map((start, i) => {
    const end = i + 1 < pageStarts.length ? pageStarts[i + 1] : cards.length;
    return cards.slice(start, end);
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
          className="flex h-full w-full"
          style={{
            transform: `translateX(-${page * 100}%)`,
            transition: isDragging ? "none" : "transform 200ms ease-out",
          }}
        >
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {pages.map((pageCards, pi) => (
              <div
                key={pi}
                className="flex h-full w-full shrink-0 flex-col gap-2 overflow-hidden"
              >
                {pageCards.map((card) => (
                  <div key={card.id} ref={(el) => setCardNode(card.id, el)}>
                    <SortableCard card={card} onOpen={onOpenCard} />
                  </div>
                ))}
              </div>
            ))}
          </SortableContext>
        </div>
      </div>

      {/* 점 영역 높이를 항상 확보 → 표시/숨김이 재분할을 요동치게 하지 않는다. */}
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
