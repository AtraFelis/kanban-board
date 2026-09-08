import type { Board } from "@/types";

// 보드의 모든 카드에서 쓰인 라벨을 중복 없이 모아 정렬한다. 태그 입력 자동완성용.
export function allLabels(board: Board): string[] {
  const set = new Set<string>();
  for (const card of Object.values(board.cards)) {
    for (const label of card.labels) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
