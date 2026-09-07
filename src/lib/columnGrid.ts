import type { CSSProperties } from "react";

// 컬럼 배치 규칙 (풀보드·위젯 공통):
// - 넓으면 컬럼들이 한 줄에서 창 너비를 균등하게 나눠 채운다 (카드 크기에 맞춰
//   줄어들지 않는다)
// - 좁으면 컬럼이 아랫줄로 접힌다 (가로 스크롤 없음)
// - 각 행은 세로 공간을 균등하게 채운다 → 컬럼이 카드 수와 무관하게 길어진다
const COLUMN_MIN_WIDTH = "240px";

export const COLUMN_GRID_STYLE: CSSProperties = {
  gridTemplateColumns: `repeat(auto-fit, minmax(${COLUMN_MIN_WIDTH}, 1fr))`,
  gridAutoRows: "minmax(0, 1fr)",
};
