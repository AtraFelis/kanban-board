import { type Card, type ChecklistItem } from "@/types";

// 카드 생성·편집 폼이 공유하는 값 모양. dueDate/description은 "" = 미지정.
export interface CardFormValue {
  title: string;
  description: string;
  dueDate: string;
  labels: string[];
  checklist: ChecklistItem[];
}

export function emptyCardForm(): CardFormValue {
  return { title: "", description: "", dueDate: "", labels: [], checklist: [] };
}

export function cardToForm(card: Card): CardFormValue {
  return {
    title: card.title,
    description: card.description ?? "",
    dueDate: card.dueDate ?? "",
    labels: card.labels,
    checklist: card.checklist,
  };
}

// 스토어의 addCard(NewCardInput) / updateCard(CardPatch)에 넘길 수 있는 모양으로 정규화.
export function cardFormToInput(form: CardFormValue) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    dueDate: form.dueDate || undefined,
    labels: form.labels,
    checklist: form.checklist,
  };
}
