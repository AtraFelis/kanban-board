// 로컬 기준 오늘 날짜를 "YYYY-MM-DD"로. Card.dueDate와 같은 포맷.
export function todayISODate(): string {
  return toISODate(new Date());
}

function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
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
