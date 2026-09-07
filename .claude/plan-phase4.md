# Phase 4 계획 — 패키징 & 배포

plan.md Phase 4. 완료 기준: `.msi`로 새 환경에 설치 후 정상 동작 확인.
Phase 3 게이트(재부팅 후 위젯 자동 실행 + 데이터 보존)도 여기서 함께 검증한다.

## 1. `.msi` 빌드

- `tauri.conf.json` `bundle`:
  - `targets: ["msi"]` (NSIS `.exe`는 제외, 계획이 `.msi` 명시)
  - `publisher`, `copyright`, `category`, `shortDescription`, `longDescription` 추가
  - `windows.webviewInstallMode: downloadBootstrapper` (기본값, 설치 파일 경량)
  - `windows.wix.language: ["ko-KR"]` — productName 등에 한글이 있어 WiX light.exe가
    코드페이지 1252로 인코딩 못 해 LGHT0311로 실패한다. ko-KR은 코드페이지 949 사용.
- 빌드: PowerShell에서 `~/.cargo/bin` PATH 추가 후 `npm run tauri build`
  - 최초 빌드 시 Tauri가 WiX Toolset을 자동 다운로드한다. (~1분 40초 릴리스 컴파일 + 번들)
  - 산출물: `src-tauri/target/release/bundle/msi/칸반보드_0.1.0_x64_ko-KR.msi` (약 2.4MB)
- 결과물 실행 파일: `src-tauri/target/release/kanban-board.exe` (약 4.9MB)
- ✅ 빌드 성공 확인됨 (2026-09-08). light.exe ICE 경고(REINSTALLMODE/ICE57/ICE61)는
  Tauri 기본 템플릿 것으로 무해.

## 2. 설치 후 스모크 테스트 (설치한 PC)

- [ ] `.msi` 더블클릭 → 설치 완료, 시작 메뉴에 "칸반보드" 등록
- [ ] 첫 실행: 위젯 창이 바탕화면에 뜬다 (main 창은 숨김)
- [ ] 트레이 아이콘: 좌클릭 → 풀보드 토글 / 우클릭 메뉴 4개 동작
- [ ] `Ctrl+Alt+K` → 풀보드 토글
- [ ] 카드 추가/편집/삭제/드래그, 위젯↔풀보드 실시간 동기화
- [ ] 트레이 "위젯 위치/크기 조정" → 드래그 바 표시 + 이동/리사이즈 후 다시 눌러 고정
- [ ] 내보내기(JSON) → 파일 저장 다이얼로그 → 저장됨
- [ ] 가져오기(JSON) → 경고 다이얼로그 → 보드 교체
- [ ] 빈 영역/카드 우클릭 시 브라우저 기본 메뉴(뒤로/새로고침/검사) 안 뜸

## 3. Phase 3 게이트 — autostart + 영속성

- [ ] 위젯/풀보드 메뉴에서 "시작 시 자동 실행" 켜기 (레지스트리 `HKCU\...\Run` 등록 확인)
- [ ] 카드 몇 개 만들고 위젯 위치 조정
- [ ] **PC 재부팅**
- [ ] 부팅 후: 로그인하면 위젯이 자동으로 뜬다
- [ ] 재부팅 전 카드·위젯 위치가 그대로 보존됨
- [ ] 데이터 위치: `%APPDATA%\com.kanbanboard.app\` (tauri-plugin-store JSON)

## 4. 소크 테스트 (며칠 상시 실행)

- [ ] 3~5일간 껐다 켜지 않고 계속 실행
- [ ] 작업 관리자에서 메모리 추이 관찰 — 꾸준히 증가(누수)하지 않는지
- [ ] 자동 저장이 계속 안정적인지 (수시로 카드 편집 → 재시작 후 반영 확인)
- [ ] 트레이/단축키/위젯 전환이 며칠 뒤에도 정상인지

## 5. 마무리

- [ ] 버전 태그 (`v0.1.0`) + `.msi` 아카이브
- [ ] README에 설치/사용법 (선택)

## 알려진 주의점

- autostart는 **설치된 exe 경로**를 등록한다. `npm run tauri dev`/`npm run dev`로는
  의미 있는 재부팅 테스트 불가 — 반드시 `.msi` 설치본으로.
- 위젯은 `transparent: true` + `decorations: false`. 일부 환경에서 투명/그림자
  렌더가 드라이버 영향을 받을 수 있으니 설치 PC에서 육안 확인.
- 코드 서명 없음 → 최초 실행 시 SmartScreen 경고 가능. 개인용이므로 "추가 정보 →
  실행"으로 진행.
