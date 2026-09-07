import { invoke } from "@tauri-apps/api/core";

// 컬럼 하나가 차지하는 최소 가로 = 최소 너비(260) + 컬럼 간격(12).
const COLUMN_SLOT = 272;
const BOARD_PADDING = 24;
const MIN_WIDTH = 480;
// 컬럼이 아주 많아지면 창을 무한정 키우지 않고 이 지점부터는 가로 스크롤을 허용.
const MAX_WIDTH = 1680;

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// 모든 컬럼이 최소 너비로 보이는 폭을 계산해 창의 최소 가로로 설정한다.
// 이 아래로는 창이 줄지 않으므로 컬럼 몇 개까지는 가로 스크롤이 생기지 않는다.
export function syncMinBoardWidth(columnCount: number): void {
  if (!isTauri) return;
  const width = Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, columnCount * COLUMN_SLOT + BOARD_PADDING),
  );
  void invoke("set_min_board_width", { width });
}
