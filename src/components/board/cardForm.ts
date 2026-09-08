import { isoFromLocalDate, toISODate } from "@/lib/date";
import { type Card, type ChecklistItem } from "@/types";

// 카드 제목 최대 길이. 입력창 maxLength + 저장 시 방어적으로 자른다.
export const CARD_TITLE_MAX = 120;

// 카드 생성·편집 폼이 공유하는 값 모양. 날짜/설명/색은 "" = 미지정.
export interface CardFormValue {
  title: string;
  description: string;
  dueDate: string;
  // "YYYY-MM-DD". 생성 폼에서 ""면 실제 생성 시각(now)을 쓴다.
  createdAt: string;
  // "YYYY-MM-DD". 완료 컬럼에 있는 카드만 편집창에 노출된다. ""면 미지정.
  completedAt: string;
  labels: string[];
  checklist: ChecklistItem[];
  color: string;
}

export function emptyCardForm(): CardFormValue {
  return {
    title: "",
    description: "",
    dueDate: "",
    createdAt: "",
    completedAt: "",
    labels: [],
    checklist: [],
    color: "",
  };
}

export function cardToForm(card: Card): CardFormValue {
  return {
    title: card.title,
    description: card.description ?? "",
    dueDate: card.dueDate ?? "",
    createdAt: toISODate(card.createdAt),
    completedAt: card.completedAt ? toISODate(card.completedAt) : "",
    labels: card.labels,
    checklist: card.checklist,
    color: card.color ?? "",
  };
}

// 스토어의 addCard(NewCardInput) / updateCard(CardPatch)에 넘길 수 있는 모양으로 정규화.
export function cardFormToInput(form: CardFormValue) {
  return {
    title: form.title.trim().slice(0, CARD_TITLE_MAX),
    description: form.description.trim() || undefined,
    dueDate: form.dueDate || undefined,
    createdAt: form.createdAt ? isoFromLocalDate(form.createdAt) : undefined,
    completedAt: form.completedAt
      ? isoFromLocalDate(form.completedAt)
      : undefined,
    labels: form.labels,
    checklist: form.checklist,
    color: form.color || undefined,
  };
}
