import type { CSSProperties } from "react";

// 컬럼 배치 규칙 (풀보드·위젯 공통):
// - 넓으면 컬럼들이 한 줄에서 창 너비를 균등하게 나눠 채운다 (카드 크기에 맞춰
//   줄어들지 않는다)
// - 좁으면 컬럼이 아랫줄로 접힌다 (가로 스크롤 없음)
// - 각 행은 남는 세로 공간을 채우되(1fr), minRowHeight 아래로는 줄지 않는다.
//   컬럼이 여러 줄로 늘어나 창보다 길어지면 컨테이너가 세로 스크롤된다.
const COLUMN_MIN_WIDTH = "240px";

// 풀보드/위젯 각각의 한 행 최소 높이(px). 이 아래로는 컬럼이 찌부되지 않는다.
export const FULLBOARD_MIN_ROW_HEIGHT = 340;
export const WIDGET_MIN_ROW_HEIGHT = 200;

export function columnGridStyle(minRowHeight: number): CSSProperties {
  return {
    gridTemplateColumns: `repeat(auto-fit, minmax(${COLUMN_MIN_WIDTH}, 1fr))`,
    gridAutoRows: `minmax(${minRowHeight}px, 1fr)`,
  };
}
