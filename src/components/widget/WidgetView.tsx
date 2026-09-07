import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";

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

// "바탕화면에 고정" 상태를 창에 반영한다 (크기 조절 불가 + 항상 다른 창들 뒤).
async function applyPinToWindow(pinned: boolean) {
  try {
    await getCurrentWindow().setResizable(!pinned);
    await invoke("set_widget_pinned", { pinned });
  } catch {
    // Tauri 런타임이 아니면 무시
  }
}

// 바탕화면에 상주하는 작은 보드. 헤더 없이 보드만 보이고, 위젯 우클릭으로 설정.
export function WidgetView() {
  const board = useBoardStore((s) => s.board);
  const isLoaded = useBoardStore((s) => s.isLoaded);
  const init = useBoardStore((s) => s.init);
  const replaceBoard = useBoardStore((s) => s.replaceBoard);

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [autostart, setAutostartState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<WidgetSettings>(getWidgetSettings);
  const { locked } = settings;

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

  // 잠금(바탕화면 고정) 상태를 창에 반영한다 (첫 마운트 포함).
  useEffect(() => {
    void applyPinToWindow(locked);
  }, [locked]);

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
      <ContextMenuItem onSelect={() => updateSettings({ locked: !locked })}>
        {locked ? "바탕화면 고정 해제" : "바탕화면에 고정"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={toggleAutostart}>
        {autostart ? "✓ 시작 시 자동 실행" : "시작 시 자동 실행"}
      </ContextMenuItem>
      <ContextMenuItem onSelect={() => setSettingsOpen(true)}>
        모양 설정…
      </ContextMenuItem>
      <ContextMenuSeparator />
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
            // 잠기지 않았으면 빈 영역을 잡아 창을 옮길 수 있다 (컬럼/카드는 자식이라 제외).
            {...(locked ? {} : { "data-tauri-drag-region": true })}
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

            {!isLoaded || !board ? (
              <p className="text-xs text-muted-foreground">불러오는 중…</p>
            ) : (
              <BoardColumns
                board={board}
                onOpenCard={setOpenCardId}
                onOpenCreate={setCreateColumnId}
                columnClassName={WIDGET_COLUMN_CLASS}
                columnMenuExtra={widgetMenuItems}
              />
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>{widgetMenuItems}</ContextMenuContent>
      </ContextMenu>

      <CardDetailDialog
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
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
    </>
  );
}
