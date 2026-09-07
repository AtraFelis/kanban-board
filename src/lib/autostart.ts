import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

// Windows 로그인 시 앱 자동 실행 여부. Tauri 밖에서는 항상 false.

export async function getAutostart(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function setAutostart(on: boolean): Promise<void> {
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
