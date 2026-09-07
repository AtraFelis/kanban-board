# 빌드 / 실행 / 테스트 명령어

Tauri v2 + React/TypeScript/Vite 스택 기준 표준 명령어. `package.json`과
`src-tauri/Cargo.toml`이 아직 없다면 Phase 0(스캐폴딩) 이전 상태이므로,
아래 명령을 실행하기 전에 plan.md의 Phase 0 항목부터 진행한다.

## 개발 실행
- `npm run tauri dev` — 프론트엔드 + Rust 셸을 함께 띄우는 개발 모드. 기능 확인은 항상 이 명령으로 한다.
- `npm run dev` — Vite 프론트엔드만 브라우저에서 미리 볼 때 (Tauri API는 동작하지 않음, UI만 빠르게 확인할 때 사용).

## 빌드
- `npm run build` — 프론트엔드 타입 체크 + 빌드.
- `npm run tauri build` — Windows 배포용 `.msi` 번들 생성 (Phase 4).

## 테스트 / 정적 검사
- `npm run lint` — ESLint. 커밋 전 실행.
- `npm test` — 프론트엔드 테스트 (도입 후).
- `cargo build` — `src-tauri` 디렉토리에서 Rust 컴파일 확인.
- `cargo fmt` — Rust 코드 포맷팅.
- `cargo test` — Rust 단위 테스트 (도입 후).

## 작업 전 확인
- `package.json` 또는 `src-tauri/Cargo.toml`이 없으면 위 명령어 대신 plan.md Phase 0부터 진행한다.
