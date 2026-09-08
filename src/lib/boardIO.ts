import { invoke } from "@tauri-apps/api/core";
import { ask, message } from "@tauri-apps/plugin-dialog";

import type { Board } from "@/types";

// 로컬 전용 저장의 백업 수단: 보드를 JSON 파일로 내보내고, 파일에서 가져온다.
// 파일 다이얼로그와 실제 읽기/쓰기는 Rust 커맨드가 담당한다.
// 경고/오류 표시는 @tauri-apps/plugin-dialog 사용 (native confirm은 user-activation
// 요구 때문에 파일 다이얼로그 뒤에서는 안 뜨는 경우가 있음).

const IMPORT_WARNING =
  "가져오기를 하면 현재 칸반보드의 모든 내용이 이 파일의 내용으로 완전히 대체됩니다.\n" +
  "이 작업은 되돌릴 수 없습니다.\n\n" +
  "지금 데이터를 남기려면 먼저 '내보내기'로 백업하세요.\n\n" +
  "계속 진행할까요?";

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
    b.cards === null ||
    (b.archivedCards !== undefined && !Array.isArray(b.archivedCards))
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
    await message(`내보내기 실패: ${errorMessage(e)}`, {
      title: "내보내기",
      kind: "error",
    });
  }
}

// 열기 다이얼로그 → 파싱·검증 → 경고 확인 후 보드 교체. 취소하면 조용히 끝난다.
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
      await message("JSON을 읽을 수 없습니다. 올바른 파일인지 확인하세요.", {
        title: "가져오기 실패",
        kind: "error",
      });
      return;
    }
    if (!isBoard(parsed)) {
      await message("칸반보드 데이터 형식이 아닙니다.", {
        title: "가져오기 실패",
        kind: "error",
      });
      return;
    }

    const proceed = await ask(IMPORT_WARNING, {
      title: "가져오기 — 현재 보드 대체",
      kind: "warning",
      okLabel: "대체하고 가져오기",
      cancelLabel: "취소",
    });
    if (!proceed) return;

    replace(parsed);
  } catch (e) {
    await message(`가져오기 실패: ${errorMessage(e)}`, {
      title: "가져오기",
      kind: "error",
    });
  }
}
