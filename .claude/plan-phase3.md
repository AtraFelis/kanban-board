# Phase 3 계획 — 상시 실행 편의 기능

plan.md Phase 3. 게이트: 재부팅 후 위젯 자동 실행 + 데이터 보존.

## 1. JSON 내보내기 / 가져오기 (우선순위 높음)

로컬 전용 저장의 유일한 백업 수단.

- **내보내기**: 현재 보드 → JSON 파일로 저장. Rust 커맨드 `export_board(json)` 가
  저장 다이얼로그(`tauri-plugin-dialog`) 열고 `std::fs::write`.
- **가져오기**: Rust 커맨드 `import_board() -> Option<String>` 가 열기 다이얼로그 +
  파일 읽어 문자열 반환. JS가 파싱·검증 후 스토어 교체(`replaceBoard`).
  - 검증: `columns`/`cards` 형태 확인, 아니면 에러 알림.
  - 확인 다이얼로그("현재 보드를 덮어씁니다").
- UI: 풀보드 헤더 `⋯` 메뉴에 "내보내기" / "가져오기". 위젯 ⚙ 메뉴에도.
- 커맨드는 Rust에서 dialog+fs 직접 처리 → JS쪽 fs capability juggling 불필요.
  `tauri-plugin-dialog` 플러그인 등록만.

## 2. 마감 임박 카드 강조

- `dueDate` 기준 색:
  - 지남(`< 오늘`) → destructive(빨강)
  - 오늘~3일 이내 → 경고색(amber)
  - 그 외 → muted
- 풀보드 `CardView` + 위젯 카드 행 둘 다 적용. `src/lib/date.ts`에 `dueStatus(dueDate)` 헬퍼.

## 3. autostart (Windows 시작 시 자동 실행)

- `tauri-plugin-autostart` 등록. 토글(위젯 ⚙ 또는 헤더 메뉴) → `enable()`/`disable()`/
  `isEnabled()`.
- 앱은 이미 시작 시 위젯 표시가 기본 → autostart 켜면 재부팅 후 위젯 자동 실행.
- 게이트: 재부팅 후 위젯 뜨고 데이터 유지.

## 진행 순서

1. `feat/phase3` 브랜치. JSON 내보내기/가져오기 (커맨드 + 스토어 replaceBoard + 메뉴).
2. 마감 임박 강조 (헬퍼 + CardView + 위젯).
3. autostart (플러그인 + 토글).
4. 게이트 확인 → PR.

## 새 의존성 (예정)

- `tauri-plugin-dialog`, `tauri-plugin-autostart` (+ JS 대응 패키지, autostart는 JS에서 토글)
