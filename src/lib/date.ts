// 로컬 기준 오늘 날짜를 "YYYY-MM-DD"로. Card.dueDate와 같은 포맷.
export function todayISODate(): string {
  return toISODate(new Date());
}

// Date를 로컬 기준 "YYYY-MM-DD"로. (ISO 문자열이나 Date 어느 쪽이든 넘길 수 있게)
export function toISODate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// "YYYY-MM-DD"를 사람이 읽기 좋은 라벨로. 오늘/어제는 그 말로, 나머지는 그대로.
export function friendlyDateLabel(iso: string): string {
  if (iso === todayISODate()) return "오늘";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === toISODate(yesterday)) return "어제";
  return iso;
}

export type DueStatus = "none" | "overdue" | "soon" | "later";

// 며칠 이내를 "임박"으로 볼지.
const SOON_DAYS = 3;

// 마감일 문자열("YYYY-MM-DD")을 오늘 기준 상태로 분류한다.
export function dueStatus(dueDate: string | undefined): DueStatus {
  if (!dueDate) return "none";
  const today = todayISODate();
  if (dueDate < today) return "overdue";

  const limit = new Date();
  limit.setDate(limit.getDate() + SOON_DAYS);
  if (dueDate <= toISODate(limit)) return "soon";
  return "later";
}

// 상태별 텍스트 색 클래스 (없거나 later면 muted).
export function dueColorClass(status: DueStatus): string {
  switch (status) {
    case "overdue":
      return "text-destructive";
    case "soon":
      return "text-amber-600 dark:text-amber-500";
    default:
      return "text-muted-foreground";
  }
}
