import type { CSSProperties } from "react";

// 컬럼 배치 규칙 (풀보드·위젯 공통):
// - 넓으면 한 줄에 컬럼들이 남은 너비를 나눠 채운다 (오른쪽 공백 없음)
// - 좁으면 컬럼이 아랫줄로 접힌다 (가로 스크롤 없음)
const COLUMN_MIN_WIDTH = "200px";

export const COLUMN_GRID_STYLE: CSSProperties = {
  gridTemplateColumns: `repeat(auto-fit, minmax(${COLUMN_MIN_WIDTH}, 1fr))`,
};
