import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";

import { ArchivePanel } from "@/components/board/ArchivePanel";
import { BoardColumns } from "@/components/board/BoardColumns";
import { CardCreateDialog } from "@/components/board/CardCreateDialog";
import { CardDetailDialog } from "@/components/board/CardDetailDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getAutostart, setAutostart } from "@/lib/autostart";
import { WIDGET_MIN_ROW_HEIGHT } from "@/lib/columnGrid";
import { exportBoardToFile, importBoardFromFile } from "@/lib/boardIO";
import {
  getWidgetSettings,
  saveWidgetSettings,
  type WidgetSettings,
} from "@/lib/widgetSettings";
import { useBoardStore } from "@/store/boardStore";

import { WidgetSettingsDialog } from "./WidgetSettingsDialog";

// 위젯 컬럼은 풀보드보다 조금 더 컴팩트하게.
const WIDGET_COLUMN_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col gap-1 rounded-md bg-muted/50 p-1.5";

// 풀보드 창을 띄운다 (숨겨져 있으면 표시 + 포커스).
async function openFullBoard() {
  try {
    const main = await Window.getByLabel("main");
    await main?.show();
    await main?.setFocus();
  } catch {
    // Tauri 런타임이 아니면 무시
  }
}

// "위치·크기 조정" 모드를 창에 반영한다.
// 켜면: 항상 위 + 크기 조절 가능 + 바탕화면 고정 해제 (드래그로 이동 가능).
// 끄면: 다시 바탕화면에 고정 (다른 창들 뒤, 크기 잠금).
async function applyAdjustMode(on: boolean) {
  try {
    const win = getCurrentWindow();
    await win.setResizable(on);
    await win.setAlwaysOnTop(on);
    await invoke("set_widget_pinned", { pinned: !on });
    if (on) await win.setFocus();
  } catch {
    // Tauri 런타임이 아니면 무시
  }
}

// 바탕화면에 상주하는 작은 보드. 헤더 없이 보드만 보이고, 우클릭으로 설정 메뉴.
// 위치·크기 조정은 트레이 메뉴에서만 한다 (첫 실행 때만 자동으로 조정 모드).
export function WidgetView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const replaceBoard = useBoardStore((s) => s.replaceBoard);

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [autostart, setAutostartState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings>(getWidgetSettings);
  // 첫 실행(위치를 한 번도 안 잡음)이면 조정 모드로 시작해 사용자가 자리잡게 한다.
  const [adjustMode, setAdjustMode] = useState(!settings.everPositioned);

  function updateSettings(patch: Partial<WidgetSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveWidgetSettings(next);
      return next;
    });
  }

  useEffect(() => {
    void init();
    void getAutostart().then(setAutostartState);
  }, [init]);

  // 조정을 끝내는 순간 "위치를 잡았다"고 기록 → 다음 실행부터는 고정으로 시작.
  function stampPositioned() {
    setSettings((s) => {
      if (s.everPositioned) return s;
      const updated = { ...s, everPositioned: true };
      saveWidgetSettings(updated);
      return updated;
    });
  }

  // 조정 모드를 끝내고 바탕화면에 고정한다 (헤더 "여기 고정" 버튼).
  function finishAdjust() {
    stampPositioned();
    setAdjustMode(false);
  }

  // 트레이의 "위젯 위치/크기 조정" 메뉴가 이 이벤트를 보낸다. 누를 때마다 토글.
  useEffect(() => {
    const unlisten = listen("widget:toggle-adjust", () => {
      setAdjustMode((prev) => {
        if (prev) stampPositioned();
        return !prev;
      });
    });
    return () => {
      void unlisten.then((off) => off());
    };
  }, []);

  // 조정 모드를 창 상태(크기 조절/항상 위/고정)에 반영한다. 첫 마운트 포함.
  useEffect(() => {
    void applyAdjustMode(adjustMode);
  }, [adjustMode]);

  function toggleAutostart() {
    const next = !autostart;
    setAutostartState(next);
    void setAutostart(next);
  }

  // 색 커스터마이즈: null이면 테마 기본. --card / --foreground를 덮으면
  // bg-card, text-foreground 등이 따라온다.
  const rootStyle: Record<string, string> = {};
  if (settings.cardColor) rootStyle["--card"] = settings.cardColor;
  if (settings.textColor) rootStyle["--foreground"] = settings.textColor;

  // 위젯 설정 항목. 위젯 빈 영역과 컬럼 우클릭 메뉴 양쪽에서 쓴다.
  const widgetMenuItems = (
    <>
      <ContextMenuItem onSelect={() => void openFullBoard()}>
        풀보드 열기
      </ContextMenuItem>
      <ContextMenuItem onSelect={toggleAutostart}>
        {autostart ? "✓ 시작 시 자동 실행" : "시작 시 자동 실행"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setSettingsOpen(true)}>
        모양 설정…
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => setArchiveOpen(true)}>
        보관함
      </ContextMenuItem>
      <ContextMenuItem
        onSelect={() => {
          if (board) void exportBoardToFile(board);
        }}
      >
        내보내기 (JSON)
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => void importBoardFromFile(replaceBoard)}>
        가져오기 (JSON)
      </ContextMenuItem>
    </>
  );

  return (
    <>
      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>
          <div
            className="relative flex h-screen flex-col rounded-xl border p-2 text-sm text-foreground shadow-lg select-none"
            style={rootStyle as React.CSSProperties}
          >
            {/* 배경 레이어: 불투명도만 이 레이어에 적용해 내용은 선명하게 유지 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-xl backdrop-blur"
              style={{
                backgroundColor: settings.bgColor ?? "var(--background)",
                opacity: settings.opacity,
              }}
            />

            {/* 조정 모드에서만 보이는 드래그 손잡이. 컬럼이 배경을 꽉 채워
                따로 잡을 곳이 없으므로 전용 바를 둔다. */}
            {adjustMode && (
              <div
                data-tauri-drag-region
                className="mb-1 flex shrink-0 cursor-move items-center justify-between gap-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
              >
                <span data-tauri-drag-region className="min-w-0 flex-1 text-center">
                  위치·크기 조정 중 — 드래그해서 이동
                </span>
                <button
                  type="button"
                  onClick={finishAdjust}
                  className="shrink-0 rounded bg-primary-foreground/20 px-2 py-0.5 font-medium hover:bg-primary-foreground/30"
                >
                  ✓ 여기 고정
                </button>
              </div>
            )}

            {!isLoaded || !board ? (
              <p className="text-xs text-muted-foreground">불러오는 중…</p>
            ) : (
              <BoardColumns
                board={board}
                onOpenCard={setOpenCardId}
                onOpenCreate={setCreateColumnId}
                columnClassName={WIDGET_COLUMN_CLASS}
                columnMenuExtra={widgetMenuItems}
                minRowHeight={WIDGET_MIN_ROW_HEIGHT}
              />
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>{widgetMenuItems}</ContextMenuContent>
      </ContextMenu>

      <CardDetailDialog cardId={openCardId} onClose={() => setOpenCardId(null)} />
      <CardCreateDialog
        columnId={createColumnId}
        onClose={() => setCreateColumnId(null)}
      />
      <WidgetSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
      />
      <ArchivePanel
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </>
  );
}
