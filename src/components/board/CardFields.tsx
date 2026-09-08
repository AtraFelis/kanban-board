import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import { allLabels } from "@/lib/labels";
import { useBoardStore } from "@/store/boardStore";

import type { CardFormValue } from "./cardForm";

const LABEL_LIST_ID = "card-label-suggestions";

interface CardFieldsProps {
  value: CardFormValue;
  onChange: (patch: Partial<CardFormValue>) => void;
}

// 제목·설명·마감일·생성일·라벨·체크리스트 입력 묶음. value/onChange로 동작하되,
// 라벨 자동완성 목록만 스토어에서 파생한다.
export function CardFields({ value, onChange }: CardFieldsProps) {
  const [labelDraft, setLabelDraft] = useState("");
  const [checklistDraft, setChecklistDraft] = useState("");

  const board = useBoardStore((s) => s.board);
  const labelOptions = useMemo(
    () => (board ? allLabels(board) : []),
    [board],
  );

  function addLabel() {
    const label = labelDraft.trim();
    setLabelDraft("");
    if (!label || value.labels.includes(label)) return;
    onChange({ labels: [...value.labels, label] });
  }

  function addChecklistItem() {
    const text = checklistDraft.trim();
    if (!text) return;
    onChange({
      checklist: [...value.checklist, { id: createId(), text, done: false }],
    });
    setChecklistDraft("");
  }

  const doneCount = value.checklist.filter((i) => i.done).length;

  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">제목</span>
        <Input
          autoFocus
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>

      <label className="grid gap-1 text-sm">
        <span className="font-medium">설명</span>
        <Textarea
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="설명을 입력하세요"
          // field-sizing-content: 내용에 맞춰 높이 자동 확장 (구형 3줄 고정 + 스크롤 제거)
          className="field-sizing-content max-h-60 min-h-20 resize-none leading-relaxed"
        />
      </label>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="grid gap-1">
          <span className="font-medium">마감일</span>
          <Input
            type="date"
            value={value.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="w-44"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-medium">생성일</span>
          <Input
            type="date"
            value={value.createdAt}
            onChange={(e) => onChange({ createdAt: e.target.value })}
            className="w-44"
          />
        </label>
      </div>

      <div className="grid gap-1 text-sm">
        <span className="font-medium">카드 색</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value.color || "#ffffff"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="size-8 rounded border bg-transparent"
          />
          <button
            type="button"
            onClick={() => onChange({ color: "" })}
            disabled={!value.color}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
          >
            기본색
          </button>
        </div>
      </div>

      <div className="grid gap-1 text-sm">
        <span className="font-medium">라벨</span>
        {value.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {value.labels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  onChange({ labels: value.labels.filter((l) => l !== label) })
                }
                className="rounded bg-secondary px-1.5 py-0.5 text-xs hover:line-through"
                title="클릭하면 제거"
              >
                {label} ✕
              </button>
            ))}
          </div>
        )}
        <Input
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLabel();
            }
          }}
          onBlur={addLabel}
          placeholder="라벨 입력 후 Enter"
          className="h-8"
          list={LABEL_LIST_ID}
        />
        {/* 이전에 쓴 태그 자동완성 (네이티브 datalist) */}
        <datalist id={LABEL_LIST_ID}>
          {labelOptions
            .filter((l) => !value.labels.includes(l))
            .map((l) => (
              <option key={l} value={l} />
            ))}
        </datalist>
      </div>

      <div className="grid gap-1 text-sm">
        <span className="font-medium">
          체크리스트{" "}
          <span className="font-normal text-muted-foreground">
            {doneCount}/{value.checklist.length}
          </span>
        </span>
        <ul className="grid gap-0.5">
          {value.checklist.map((item) => (
            <li
              key={item.id}
              className="group/row flex items-center gap-2 rounded px-1 py-0.5 hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  onChange({
                    checklist: value.checklist.map((i) =>
                      i.id === item.id ? { ...i, done: !i.done } : i,
                    ),
                  })
                }
                className="size-3.5 shrink-0"
              />
              <span
                className={
                  item.done
                    ? "flex-1 text-muted-foreground line-through"
                    : "flex-1"
                }
              >
                {item.text}
              </span>
              <button
                type="button"
                aria-label="항목 삭제"
                onClick={() =>
                  onChange({
                    checklist: value.checklist.filter((i) => i.id !== item.id),
                  })
                }
                className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-destructive"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-1">
          <Input
            value={checklistDraft}
            onChange={(e) => setChecklistDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addChecklistItem();
              }
            }}
            placeholder="+ 항목 추가"
            className="h-8"
          />
          <Button
            type="button"
            size="sm"
            onClick={addChecklistItem}
            disabled={!checklistDraft.trim()}
          >
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
