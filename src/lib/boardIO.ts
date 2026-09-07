import { invoke } from "@tauri-apps/api/core";

import type { Board } from "@/types";

// 로컬 전용 저장의 백업 수단: 보드를 JSON 파일로 내보내고, 파일에서 가져온다.
// 파일 다이얼로그와 실제 읽기/쓰기는 Rust 커맨드가 담당한다.

function errorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const b = value as Record<string, unknown>;
  if (
    typeof b.id !== "string" ||
    typeof b.title !== "string" ||
    !Array.isArray(b.columns) ||
    typeof b.cards !== "object" ||
    b.cards === null
  ) {
    return false;
  }
  return b.columns.every((c) => {
    if (typeof c !== "object" || c === null) return false;
    const col = c as Record<string, unknown>;
    return typeof col.id === "string" && Array.isArray(col.cardIds);
  });
}

// 저장 다이얼로그 → 파일 쓰기. 사용자가 취소하면 조용히 끝난다.
export async function exportBoardToFile(board: Board): Promise<void> {
  try {
    const json = JSON.stringify(board, null, 2);
    await invoke<boolean>("export_board", { json });
  } catch (e) {
    alert(`내보내기 실패: ${errorMessage(e)}`);
  }
}

// 열기 다이얼로그 → 파싱·검증 → 확인 후 보드 교체. 취소하면 조용히 끝난다.
export async function importBoardFromFile(
  replace: (board: Board) => void,
): Promise<void> {
  try {
    const content = await invoke<string | null>("import_board");
    if (!content) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      alert("가져오기 실패: JSON을 읽을 수 없습니다.");
      return;
    }
    if (!isBoard(parsed)) {
      alert("가져오기 실패: 칸반보드 데이터 형식이 아닙니다.");
      return;
    }
    if (!confirm("현재 보드를 가져온 데이터로 덮어씁니다. 계속할까요?")) return;
    replace(parsed);
  } catch (e) {
    alert(`가져오기 실패: ${errorMessage(e)}`);
  }
}
