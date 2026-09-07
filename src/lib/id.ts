// 엔티티 id 생성. Tauri 웹뷰(Chromium)에서 crypto.randomUUID를 항상 쓸 수 있다.
export function createId(): string {
  return crypto.randomUUID();
}
