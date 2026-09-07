use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, LogicalSize, Manager,
};

// 창이 이 높이 아래로는 줄지 않도록 하는 최소 높이.
const MIN_WINDOW_HEIGHT: f64 = 420.0;

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

// 메인 창을 보이기/숨기기 토글한다. 트레이 좌클릭과 메뉴 항목이 공통으로 호출한다.
fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
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
        .setup(|app| {
            // 트레이 우클릭 메뉴: 창 토글 / 종료
            let toggle_item =
                MenuItem::with_id(app, "toggle", "창 보이기/숨기기", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_item, &quit_item])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("칸반보드")
                .menu(&menu)
                // 좌클릭은 창 토글로 쓰므로 메뉴는 우클릭에서만 연다.
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "toggle" => toggle_main_window(app),
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
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, set_min_board_width])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
