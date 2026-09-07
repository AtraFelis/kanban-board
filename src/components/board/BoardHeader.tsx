import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { exportBoardToFile, importBoardFromFile } from "@/lib/boardIO";
import { useBoardStore } from "@/store/boardStore";

// 보드 제목 + 보드 메뉴(⋯). 컬럼 추가는 여기 메뉴에서 한다.
// 이후 Phase 3의 JSON 내보내기/가져오기 등도 이 메뉴에 붙는다.
export function BoardHeader({ title }: { title: string }) {
  const addColumn = useBoardStore((s) => s.addColumn);
  const board = useBoardStore((s) => s.board);
  const replaceBoard = useBoardStore((s) => s.replaceBoard);
  const [addOpen, setAddOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  function submitColumn(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    addColumn(trimmed);
    setNameDraft("");
    setAddOpen(false);
  }

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* modal={false}: 메뉴가 body의 pointer-events를 잠그지 않아, 여기서 여는
          다이얼로그와 포커스·스크롤락이 충돌하지 않는다. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label="보드 메뉴">
            ⋯
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setAddOpen(true)}>
            컬럼 추가
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>컬럼 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitColumn} className="flex gap-2">
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="컬럼 이름"
            />
            <Button type="submit" disabled={!nameDraft.trim()}>
              추가
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
