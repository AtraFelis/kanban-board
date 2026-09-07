// 위젯 창의 로컬 설정. 보드 데이터와 무관하므로 localStorage에 둔다
// (Tauri 웹뷰의 localStorage는 재시작해도 유지된다).

const LOCKED_KEY = "widget:locked";

export function getWidgetLocked(): boolean {
  try {
    return localStorage.getItem(LOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWidgetLocked(locked: boolean): void {
  try {
    localStorage.setItem(LOCKED_KEY, locked ? "1" : "0");
  } catch {
    // 무시
  }
}
