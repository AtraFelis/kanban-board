import type { Card, ColumnSort } from "@/types";

type SortKey = Exclude<ColumnSort["by"], "manual">;

// 정렬 기준의 표시 이름과 기본 방향.
export const SORT_BY_LABEL: Record<SortKey, string> = {
  createdAt: "시작일",
  dueDate: "마감일",
  label: "태그",
};
const SORT_BY_DEFAULT_DIR: Record<SortKey, ColumnSort["dir"]> = {
  createdAt: "desc",
  dueDate: "asc",
  label: "asc",
};
export const SORT_KEYS: readonly SortKey[] = ["createdAt", "dueDate", "label"];

// 같은 기준을 다시 고르면 방향을 뒤집고, 다른 기준이면 그 기준의 기본 방향으로.
export function nextSort(
  current: ColumnSort | undefined,
  by: SortKey,
): ColumnSort {
  if (current?.by === by) {
    return { by, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { by, dir: SORT_BY_DEFAULT_DIR[by] };
}

// 헤더에 "마감일 ↑"처럼 쓸 요약. manual이면 null.
export function sortSummary(sort: ColumnSort | undefined): string | null {
  if (!sort || sort.by === "manual") return null;
  return `${SORT_BY_LABEL[sort.by]} ${sort.dir === "asc" ? "↑" : "↓"}`;
}

// 두 카드를 정렬 기준으로 비교한다. 값이 비면(마감일·태그) 방향과 무관하게 항상 뒤로 보낸다.
function compareCards(a: Card, b: Card, sort: ColumnSort): number {
  const dir = sort.dir === "desc" ? -1 : 1;
  switch (sort.by) {
    case "createdAt":
      return dir * a.createdAt.localeCompare(b.createdAt);
    case "dueDate": {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return dir * a.dueDate.localeCompare(b.dueDate);
    }
    case "label": {
      const la = a.labels[0] ?? "";
      const lb = b.labels[0] ?? "";
      if (!la && !lb) return 0;
      if (!la) return 1;
      if (!lb) return -1;
      return dir * la.localeCompare(lb);
    }
    default:
      return 0;
  }
}

// 카드 배열을 정렬해 새 배열로 돌려준다. manual이거나 sort가 없으면 원본 순서 그대로.
// 안정 정렬: 동점은 입력 순서를 유지한다.
export function sortCards(
  cards: Card[],
  sort: ColumnSort | undefined,
): Card[] {
  if (!sort || sort.by === "manual") return cards;
  return cards
    .map((card, index) => ({ card, index }))
    .sort((x, y) => compareCards(x.card, y.card, sort) || x.index - y.index)
    .map((entry) => entry.card);
}

// 정렬이 켜져 있는지 (manual은 꺼진 것으로 본다).
export function isSortActive(sort: ColumnSort | undefined): boolean {
  return !!sort && sort.by !== "manual";
}
