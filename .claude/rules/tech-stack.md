# 확정 기술 스택

임의로 다른 라이브러리나 프레임워크로 대체하지 않는다. 변경이 필요하면
먼저 이유를 설명하고 사용자 확인을 받는다.

- **셸**: Tauri v2. Rust 코드는 최소화하고 공식 플러그인을 우선 사용한다.
  Rust 관련 이슈가 반복되면 Electron 전환이 허용된 대안이므로,
  UI 로직(React 컴포넌트·상태 관리)은 특정 셸에 종속되지 않게 짠다.
- **프론트엔드**: React + TypeScript + Vite
- **스타일링**: Tailwind CSS + shadcn/ui
- **드래그 앤 드롭**: `@dnd-kit/core`, `@dnd-kit/sortable` (`react-beautiful-dnd`는 유지보수 중단되었으므로 사용하지 않는다)
- **상태 관리**: Zustand (Redux 등 더 무거운 라이브러리 도입 금지 — 이 앱 규모에 과함)
- **로컬 저장**: `tauri-plugin-store` (JSON, `%APPDATA%` 하위). 모든 영속화 로직은
  `src/lib/`의 데이터 접근 계층 뒤에 두어, 추후 `tauri-plugin-sql`(SQLite)로
  전환하더라도 컴포넌트 코드가 영향받지 않게 한다.
- **기타 공식 플러그인**: `tauri-plugin-autostart`(Windows 자동 시작), `tauri-plugin-positioner`(창 위치 기억)

## 의존성 추가 원칙
- 새 패키지를 추가할 때는 안정적인 최신 버전인지 확인한다.
- 가능하면 위 목록에 이미 있는 라이브러리로 해결하고, 정말 필요할 때만 새 의존성을 추가한다.
