// 로컬 기준 오늘 날짜를 "YYYY-MM-DD"로. Card.dueDate와 같은 포맷.
export function todayISODate(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
