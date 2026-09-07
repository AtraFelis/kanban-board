use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_global_shortcut::ShortcutState;
use tauri_plugin_window_state::StateFlags;

// 위젯이 "바탕화면 고정"(항상 다른 창들 뒤) 상태인지. 포커스가 들어올 때
// 다시 맨 뒤로 내리는 핸들러가 이 값을 참조한다.
static WIDGET_PINNED: AtomicBool = AtomicBool::new(false);

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 위젯 창을 z-order 맨 뒤로 보내거나(pinned) 원상복구한다.
// NOACTIVATE는 쓰지 않는다 — 위젯이 가려지지 않았을 땐 클릭해서 입력할 수 있어야 하므로.
#[cfg(windows)]
fn apply_desktop_pin(window: &WebviewWindow, pinned: bool) {
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_BOTTOM, HWND_TOP, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    let insert_after = if pinned { HWND_BOTTOM } else { HWND_TOP };
    unsafe {
        let _ = SetWindowPos(
            hwnd,
            Some(insert_after),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

#[cfg(not(windows))]
fn apply_desktop_pin(_window: &WebviewWindow, _pinned: bool) {}

// 프론트엔드(위젯 설정)에서 "바탕화면 고정" 토글 시 호출.
#[tauri::command]
fn set_widget_pinned(app: AppHandle, pinned: bool) {
    WIDGET_PINNED.store(pinned, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("widget") {
        apply_desktop_pin(&window, pinned);
    }
}

// 보드 JSON을 사용자가 고른 파일로 저장한다. 취소하면 Ok(false).
#[tauri::command]
fn export_board(app: AppHandle, json: String) -> Result<bool, String> {
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name("kanban-board.json")
        .blocking_save_file()
    else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    std::fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(true)
}

// 사용자가 고른 JSON 파일 내용을 문자열로 돌려준다. 취소하면 Ok(None).
#[tauri::command]
fn import_board(app: AppHandle) -> Result<Option<String>, String> {
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    Ok(Some(content))
}

// label 창을 보이기/숨기기 토글한다.
fn toggle_window(app: &AppHandle, label: &str) {
    let Some(window) = app.get_webview_window(label) else {
        return;
    };

    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // 파일 저장/열기 다이얼로그 (JSON 내보내기/가져오기)
        .plugin(tauri_plugin_dialog::init())
        // Windows 시작 시 자동 실행 (프론트에서 토글)
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        // 로컬 저장: 프론트엔드가 %APPDATA% 하위 JSON 파일에 보드 데이터를 읽고 쓴다.
        .plugin(tauri_plugin_store::Builder::new().build())
        // 창 위치·크기를 재시작해도 기억한다. 표시 여부는 저장하지 않는다
        // (풀보드는 항상 숨김으로 시작, 위젯은 항상 표시).
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION | StateFlags::SIZE)
                .build(),
        )
        // 전역 단축키 Ctrl+Alt+K: 풀보드 창 토글
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcut("ctrl+alt+k")
                .expect("잘못된 단축키")
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_window(app, "main");
                    }
                })
                .build(),
        )
        .setup(|app| {
            // 풀보드 창의 X 버튼은 종료가 아니라 숨김 (상시 실행, 트레이로 복귀)
            if let Some(main_window) = app.get_webview_window("main") {
                let hidden = main_window.clone();
                main_window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = hidden.hide();
                    }
                });
            }

            // 위젯이 어떤 이유로 포커스를 받으면(클릭 등) 고정 상태일 때 다시 맨 뒤로 내린다.
            if let Some(widget_window) = app.get_webview_window("widget") {
                let sink = widget_window.clone();
                widget_window.on_window_event(move |event| {
                    if let WindowEvent::Focused(true) = event {
                        if WIDGET_PINNED.load(Ordering::SeqCst) {
                            apply_desktop_pin(&sink, true);
                        }
                    }
                });
            }

            // 트레이 우클릭 메뉴: 풀보드 토글 / 위젯 토글 / 종료
            let board_item =
                MenuItem::with_id(app, "toggle_main", "풀보드 표시/숨김", true, None::<&str>)?;
            let widget_item =
                MenuItem::with_id(app, "toggle_widget", "위젯 표시/숨김", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&board_item, &widget_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("칸반보드")
                .menu(&menu)
                // 좌클릭은 창 토글로 쓰므로 메뉴는 우클릭에서만 연다.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle_main" => toggle_window(app, "main"),
                    "toggle_widget" => toggle_window(app, "widget"),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_window(tray.app_handle(), "main");
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            set_widget_pinned,
            export_board,
            import_board
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
