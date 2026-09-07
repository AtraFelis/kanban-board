import { emit, listen } from "@tauri-apps/api/event";

// 창(webview)마다 별도 JS 컨텍스트라 스토어도 따로다.
// 한쪽에서 저장하면 이벤트를 쏘고, 다른 창은 그걸 받아 다시 로드한다.

const EVENT = "board:updated";
const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
// 이 창의 고유 id. 자기가 쏜 이벤트는 무시하기 위해 payload로 실어 보낸다.
const senderId =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Math.random());

// 보드를 저장한 직후 호출. 다른 창에 "바뀌었다"고 알린다.
export function notifyBoardChanged(): void {
  if (!isTauri) return;
  void emit(EVENT, { senderId });
}

// 다른 창의 변경 알림을 구독한다. 자기 자신이 쏜 것은 건너뛴다.
export function subscribeBoardChanges(onExternalChange: () => void): void {
  if (!isTauri) return;
  void listen<{ senderId: string }>(EVENT, (event) => {
    if (event.payload?.senderId === senderId) return;
    onExternalChange();
  });
}
