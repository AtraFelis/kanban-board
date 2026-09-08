import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toISODate } from "@/lib/date";
import { useBoardStore } from "@/store/boardStore";
import type { Card } from "@/types";

import { ConfirmDialog } from "./ConfirmDialog";

// 셀렉터가 매 렌더 새 배열을 반환하면 무한 루프가 나므로 고정 참조를 쓴다.
const NO_CARDS: Card[] = [];

interface ArchivePanelProps {
  open: boolean;
  onClose: () => void;
}

// 보드 밖으로 치운 완료 카드 목록. 검색 / 복원 / 영구 삭제 / 자동 보관 설정.
export function ArchivePanel({ open, onClose }: ArchivePanelProps) {
  const archived = useBoardStore((s) => s.board?.archivedCards ?? NO_CARDS);
  const autoDays = useBoardStore((s) => s.board?.autoArchiveDays ?? 0);
  const restoreCard = useBoardStore((s) => s.restoreCard);
  const deleteArchivedCard = useBoardStore((s) => s.deleteArchivedCard);
  const setAutoArchiveDays = useBoardStore((s) => s.setAutoArchiveDays);
  const sweepAutoArchive = useBoardStore((s) => s.sweepAutoArchive);

  const [query, setQuery] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...archived]
      .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""))
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.labels.some((l) => l.toLowerCase().includes(q)),
      );
  }, [archived, query]);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-5 py-3.5 text-left">
            <DialogTitle>보관함 ({archived.length})</DialogTitle>
          </DialogHeader>

          <div className="shrink-0 border-b px-5 py-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목·태그 검색"
              className="h-8"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {list.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {archived.length === 0
                  ? "보관된 카드가 없습니다."
                  : "검색 결과가 없습니다."}
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {list.map((c) => (
                  <li key={c.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="min-w-0 flex-1 wrap-anywhere font-medium">
                        {c.title}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => restoreCard(c.id)}
                        >
                          복원
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive"
                          onClick={() => setConfirmDeleteId(c.id)}
                        >
                          삭제
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      {c.completedAt && <span>완료 {toISODate(c.completedAt)}</span>}
                      {c.labels.map((l) => (
                        <span key={l} className="rounded bg-secondary px-1 py-0.5">
                          {l}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t px-5 py-3 text-sm">
            <label className="flex items-center gap-1.5">
              완료 후
              <Input
                type="number"
                min={0}
                value={autoDays || ""}
                placeholder="0"
                onChange={(e) =>
                  setAutoArchiveDays(Number(e.target.value) || null)
                }
                className="h-8 w-16"
              />
              일 지나면 자동 보관
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => sweepAutoArchive()}
              disabled={!autoDays}
            >
              지금 정리
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="영구 삭제"
        description="이 카드를 완전히 삭제합니다. 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) deleteArchivedCard(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
