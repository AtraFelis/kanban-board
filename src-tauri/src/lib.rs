use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, LogicalSize, Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::ShortcutState;

// 창이 이 높이 아래로는 줄지 않도록 하는 최소 높이.
// 카드 추가/편집 팝업(기본 폼)이 내부 스크롤 없이 다 보이는 높이 기준.
const MIN_WINDOW_HEIGHT: f64 = 780.0;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 프론트엔드가 컬럼 수에 맞춰 계산한 폭 아래로는 창이 줄지 않게 한다.
// (모든 컬럼이 최소 너비로 보이는 지점이 곧 창의 최소 폭)
#[tauri::command]
fn set_min_board_width(app: AppHandle, width: f64) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_min_size(Some(LogicalSize::new(width, MIN_WINDOW_HEIGHT)));
    }
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
        // 로컬 저장: 프론트엔드가 %APPDATA% 하위 JSON 파일에 보드 데이터를 읽고 쓴다.
        .plugin(tauri_plugin_store::Builder::new().build())
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
        .invoke_handler(tauri::generate_handler![greet, set_min_board_width])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
