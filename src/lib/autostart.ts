import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

// Windows 로그인 시 앱 자동 실행 여부. Tauri 밖에서는 항상 false.
//
// 개발 모드(`npm run tauri dev`)에서는 자동 실행을 건드리지 않는다.
// 이때 등록하면 레지스트리 Run 키가 `target/debug\kanban-board.exe`(dev URL을
// 바라보는 디버그 빌드 + 콘솔 창)를 가리키게 되어, 재부팅 시 설치본 대신 그게
// 떠서 localhost 연결 실패로 깨진다. 자동 실행은 설치본에서만 토글한다.
const isDevBuild = import.meta.env.DEV;

export async function getAutostart(): Promise<boolean> {
  if (isDevBuild) return false;
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostart(on: boolean): Promise<void> {
  if (isDevBuild) {
    console.warn(
      "[autostart] 개발 모드에서는 자동 실행을 등록하지 않습니다. 설치본에서 토글하세요.",
    );
    return;
  }
  try {
    if (on) {
      await enable();
    } else {
      await disable();
    }
  } catch {
    // Tauri 런타임이 아니면 무시
  }
}
