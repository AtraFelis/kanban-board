import { useRef, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createId } from "@/lib/id";
import type { ChecklistItem } from "@/types";

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

// 카드 편집/생성 폼의 체크리스트 입력. 항목 추가·완료 토글·삭제와 드래그 순서 변경.
export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const [draft, setDraft] = useState("");
  // 항목이 늘어 입력칸이 화면 밖으로 밀려도 다시 보이게 스크롤한다 (타자기 스크롤).
  const addRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const doneCount = items.filter((i) => i.done).length;

  function addItem() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: createId(), text, done: false }]);
    setDraft("");
    setTimeout(() => addRef.current?.scrollIntoView({ block: "nearest" }), 0);
  }

  function toggleItem(id: string) {
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(items, from, to));
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">
        체크리스트{" "}
        <span className="font-normal text-muted-foreground">
          {doneCount}/{items.length}
        </span>
      </span>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="grid gap-1">
            {items.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {/* scroll-mb: 타자기 스크롤로 이 행을 보이게 할 때 하단에 여유를 둔다 */}
      <div ref={addRef} className="flex scroll-mb-6 gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder="+ 항목 추가"
          className="h-8"
        />
        <Button
          type="button"
          size="sm"
          onClick={addItem}
          disabled={!draft.trim()}
        >
          추가
        </Button>
      </div>
    </div>
  );
}

interface ChecklistRowProps {
  item: ChecklistItem;
  onToggle: () => void;
  onRemove: () => void;
}

function ChecklistRow({ item, onToggle, onRemove }: ChecklistRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group/row flex items-center gap-2 rounded px-1 py-1 hover:bg-accent ${
        isDragging ? "relative z-10 bg-accent opacity-80" : ""
      }`}
    >
      <button
        type="button"
        aria-label="드래그해서 순서 변경"
        className="shrink-0 cursor-grab px-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        className="size-3.5 shrink-0"
      />
      <span
        className={
          item.done
            ? "min-w-0 flex-1 wrap-anywhere text-muted-foreground line-through"
            : "min-w-0 flex-1 wrap-anywhere"
        }
      >
        {item.text}
      </span>
      <button
        type="button"
        aria-label="항목 삭제"
        onClick={onRemove}
        className="shrink-0 px-0.5 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 hover:text-destructive"
      >
        ✕
      </button>
    </li>
  );
}
