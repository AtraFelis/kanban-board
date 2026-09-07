import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ask } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";

import { CardContextMenu } from "@/components/board/CardContextMenu";
import { CardCreateDialog } from "@/components/board/CardCreateDialog";
import { CardDetailDialog } from "@/components/board/CardDetailDialog";
import { ColumnContextMenu } from "@/components/board/ColumnContextMenu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getAutostart, setAutostart } from "@/lib/autostart";
import { exportBoardToFile, importBoardFromFile } from "@/lib/boardIO";
import { COLUMN_GRID_STYLE } from "@/lib/columnGrid";
import { dueColorClass, dueStatus } from "@/lib/date";
import {
  getWidgetSettings,
  saveWidgetSettings,
  type WidgetSettings,
} from "@/lib/widgetSettings";
import { useBoardStore } from "@/store/boardStore";
import type { Board, Column } from "@/types";

import { WidgetSettingsDialog } from "./WidgetSettingsDialog";

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

// 바탕화면에 상주하는 작은 보드. 더블클릭·우클릭으로 카드 추가, 카드 우클릭으로 수정/이동/삭제.
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

  return (
    <div
      className="relative flex h-screen flex-col gap-2 rounded-xl border p-2 text-sm text-foreground shadow-lg"
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

      {/* 잠겨 있지 않을 때만 이 영역을 잡고 창을 옮길 수 있다 */}
      <div
        {...(locked ? {} : { "data-tauri-drag-region": true })}
        className={`flex items-center justify-between px-1 ${
          locked ? "" : "cursor-move"
        }`}
      >
        <span
          {...(locked ? {} : { "data-tauri-drag-region": true })}
          className="font-semibold"
        >
          칸반보드
        </span>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                aria-label="위젯 설정"
              >
                ⋯
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => updateSettings({ locked: !locked })}
              >
                {locked ? "바탕화면 고정 해제" : "바탕화면에 고정"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleAutostart}>
                {autostart ? "✓ 시작 시 자동 실행" : "시작 시 자동 실행"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                모양 설정…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  if (board) void exportBoardToFile(board);
                }}
              >
                내보내기 (JSON)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => void importBoardFromFile(replaceBoard)}
              >
                가져오기 (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs"
            onClick={openFullBoard}
          >
            풀보드
          </Button>
        </div>
      </div>

      {!isLoaded || !board ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : (
        <div
          className="grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto"
          style={COLUMN_GRID_STYLE}
        >
          {board.columns.map((column) => (
            <WidgetColumn
              key={column.id}
              column={column}
              board={board}
              onOpenCard={setOpenCardId}
              onOpenCreate={setCreateColumnId}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}

function WidgetColumn({
  column,
  board,
  onOpenCard,
  onOpenCreate,
}: {
  column: Column;
  board: Board;
  onOpenCard: (cardId: string) => void;
  onOpenCreate: (columnId: string) => void;
}) {
  const renameColumn = useBoardStore((s) => s.renameColumn);
  const removeColumn = useBoardStore((s) => s.removeColumn);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);

  const cards = column.cardIds
    .map((id) => board.cards[id])
    .filter((card): card is NonNullable<typeof card> => Boolean(card));

  function startRename() {
    setTitleDraft(column.title);
    setIsEditingTitle(true);
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) renameColumn(column.id, trimmed);
    else setTitleDraft(column.title);
    setIsEditingTitle(false);
  }

  async function confirmDelete() {
    const ok = await ask(
      `"${column.title}" 컬럼을 삭제하면 이 컬럼의 카드도 모두 삭제됩니다.\n계속할까요?`,
      { title: "컬럼 삭제", kind: "warning", okLabel: "삭제", cancelLabel: "취소" },
    );
    if (ok) removeColumn(column.id);
  }

  return (
    <ColumnContextMenu
      className="flex min-w-0 flex-col gap-1 rounded-md bg-muted/50 p-1"
      onAddCard={() => onOpenCreate(column.id)}
      onRename={startRename}
      onDelete={confirmDelete}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) onOpenCreate(column.id);
      }}
    >
      {isEditingTitle ? (
        <Input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") {
              setTitleDraft(column.title);
              setIsEditingTitle(false);
            }
          }}
          className="h-6 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={startRename}
          className="truncate rounded px-1 text-left text-xs font-medium hover:bg-accent"
        >
          {column.title}{" "}
          <span className="font-normal text-muted-foreground">
            {cards.length}
          </span>
        </button>
      )}

      <div
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) onOpenCreate(column.id);
        }}
        className="flex min-h-[32px] flex-col gap-1"
      >
        {cards.map((card) => {
          const doneCount = card.checklist.filter((i) => i.done).length;
          const hasMeta =
            Boolean(card.dueDate) ||
            card.checklist.length > 0 ||
            card.labels.length > 0;
          const due = dueStatus(card.dueDate);
          return (
            <CardContextMenu key={card.id} card={card} onOpen={onOpenCard}>
              <div
                className={`rounded border bg-card px-1.5 py-1 ${
                  due === "overdue"
                    ? "border-l-2 border-l-destructive"
                    : due === "soon"
                      ? "border-l-2 border-l-amber-500"
                      : ""
                }`}
              >
                <p className="truncate text-xs font-medium">{card.title}</p>
                {hasMeta && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                    {card.dueDate && (
                      <span className={dueColorClass(due)}>
                        📅 {card.dueDate}
                      </span>
                    )}
                    {card.checklist.length > 0 && (
                      <span>
                        ☑ {doneCount}/{card.checklist.length}
                      </span>
                    )}
                    {card.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded bg-secondary px-1 py-0.5"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContextMenu>
          );
        })}
        {cards.length === 0 && (
          <p className="pointer-events-none px-1 text-[10px] text-muted-foreground">
            더블클릭 / 우클릭으로 카드 추가
          </p>
        )}
      </div>
    </ColumnContextMenu>
  );
}
