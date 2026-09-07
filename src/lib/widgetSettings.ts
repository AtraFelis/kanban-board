// 위젯 창의 로컬 설정. 보드 데이터와 무관하므로 localStorage(JSON)에 둔다
// (Tauri 웹뷰의 localStorage는 재시작해도 유지된다).

export interface WidgetSettings {
  // 위젯 배경 불투명도 0~1
  opacity: number;
  // null이면 테마 기본색 사용
  bgColor: string | null;
  cardColor: string | null;
  textColor: string | null;
  // 위치·크기를 한 번이라도 잡았는지. false면 첫 실행으로 보고 조정 모드로 시작한다.
  // 조정은 트레이 메뉴에서만 하고, 평소에는 바탕화면에 고정된 상태로 시작한다.
  everPositioned: boolean;
}

export const DEFAULT_WIDGET_SETTINGS: WidgetSettings = {
  opacity: 0.95,
  bgColor: null,
  cardColor: null,
  textColor: null,
  everPositioned: false,
};

const KEY = "widget:settings";

export function getWidgetSettings(): WidgetSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_WIDGET_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<WidgetSettings>;
    return { ...DEFAULT_WIDGET_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_WIDGET_SETTINGS };
  }
}

export function saveWidgetSettings(settings: WidgetSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 무시
  }
}
