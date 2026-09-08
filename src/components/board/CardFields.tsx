import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createId } from "@/lib/id";
import { allLabels } from "@/lib/labels";
import { useBoardStore } from "@/store/boardStore";

import type { CardFormValue } from "./cardForm";

// 자동완성 후보를 한 번에 보여줄 최대 개수.
const TAG_SUGGEST_LIMIT = 6;

interface CardFieldsProps {
  value: CardFormValue;
  onChange: (patch: Partial<CardFormValue>) => void;
  // 완료 컬럼에 있는 카드만 "완료일" 입력을 보여준다.
  showCompletedAt?: boolean;
}

// 제목·설명·시작일·마감일(·완료일)·색·태그·체크리스트 입력 묶음. value/onChange로
// 동작하되, 태그 자동완성 목록만 스토어에서 파생한다.
export function CardFields({
  value,
  onChange,
  showCompletedAt,
}: CardFieldsProps) {
  const [tagDraft, setTagDraft] = useState("");
  const [tagSuggestOpen, setTagSuggestOpen] = useState(false);
  const [activeTagIndex, setActiveTagIndex] = useState(-1);
  const [checklistDraft, setChecklistDraft] = useState("");
  // 체크리스트가 길어져도 입력칸이 화면 밖으로 밀리지 않게, 추가 후 다시 보이게 스크롤한다.
  const checklistAddRef = useRef<HTMLDivElement>(null);

  const board = useBoardStore((s) => s.board);
  const knownTags = useMemo(() => (board ? allLabels(board) : []), [board]);

  const tagSuggestions = useMemo(() => {
    const q = tagDraft.trim().toLowerCase();
    return knownTags
      .filter((t) => !value.labels.includes(t))
      .filter((t) => (q ? t.toLowerCase().includes(q) : true))
      .slice(0, TAG_SUGGEST_LIMIT);
  }, [knownTags, value.labels, tagDraft]);

  function commitTag(raw: string) {
    const tag = raw.trim();
    setTagDraft("");
    setTagSuggestOpen(false);
    setActiveTagIndex(-1);
    if (!tag || value.labels.includes(tag)) return;
    onChange({ labels: [...value.labels, tag] });
  }

  function addChecklistItem() {
    const text = checklistDraft.trim();
    if (!text) return;
    onChange({
      checklist: [...value.checklist, { id: createId(), text, done: false }],
    });
    setChecklistDraft("");
    // 새 항목이 렌더된 다음 프레임에 입력칸을 다시 보이게 (타자기 스크롤).
    setTimeout(
      () => checklistAddRef.current?.scrollIntoView({ block: "nearest" }),
      0,
    );
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
          <span className="font-medium">시작일</span>
          <Input
            type="date"
            value={value.createdAt}
            onChange={(e) => onChange({ createdAt: e.target.value })}
            className="w-44"
          />
        </label>

        <label className="grid gap-1">
          <span className="font-medium">마감일</span>
          <Input
            type="date"
            value={value.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="w-44"
          />
        </label>

        {showCompletedAt && (
          <label className="grid gap-1">
            <span className="font-medium">완료일</span>
            <Input
              type="date"
              value={value.completedAt}
              onChange={(e) => onChange({ completedAt: e.target.value })}
              className="w-44"
            />
          </label>
        )}
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
        <span className="font-medium">태그</span>
        {value.labels.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {value.labels.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  onChange({ labels: value.labels.filter((t) => t !== tag) })
                }
                className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground hover:bg-secondary/70"
                title="클릭하면 제거"
              >
                {tag}
                <span aria-hidden className="text-muted-foreground">
                  ✕
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative">
          <Input
            value={tagDraft}
            onChange={(e) => {
              setTagDraft(e.target.value);
              setTagSuggestOpen(true);
              setActiveTagIndex(-1);
            }}
            onFocus={() => setTagSuggestOpen(true)}
            onBlur={() => commitTag(tagDraft)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setTagSuggestOpen(true);
                setActiveTagIndex((i) =>
                  Math.min(i + 1, tagSuggestions.length - 1),
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveTagIndex((i) => Math.max(i - 1, -1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                commitTag(
                  activeTagIndex >= 0
                    ? tagSuggestions[activeTagIndex]
                    : tagDraft,
                );
              } else if (e.key === "Escape") {
                setTagSuggestOpen(false);
                setActiveTagIndex(-1);
              }
            }}
            placeholder="태그 입력 후 Enter"
            className="h-8"
          />

          {tagSuggestOpen && tagSuggestions.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-50 mt-1 max-h-44 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              {tagSuggestions.map((tag, i) => (
                <li key={tag}>
                  <button
                    type="button"
                    // onMouseDown + preventDefault: 입력의 onBlur보다 먼저 실행돼야 함
                    onMouseDown={(e) => {
                      e.preventDefault();
                      commitTag(tag);
                    }}
                    onMouseEnter={() => setActiveTagIndex(i)}
                    className={`w-full rounded px-2 py-1 text-left text-xs ${
                      i === activeTagIndex ? "bg-accent" : ""
                    }`}
                  >
                    {tag}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
        <div ref={checklistAddRef} className="flex gap-1">
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
