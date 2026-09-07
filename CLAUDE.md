# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 현재 상태

스캐폴딩 이전 단계. [plan.md](plan.md)만 존재하며 git 저장소가 아니다. `package.json` / `src/` / `src-tauri/` 없음 → Phase 0을 끝내기 전까지 build·lint·test 명령이 없다. 작업 시작 전 [plan.md](plan.md)를 읽을 것 (확정 스택·구조·데이터 모델·Phase 게이트의 원본). 제품 배경은 별도 `기획서.md`(claude.ai 프로젝트)에 있고 이 저장소엔 없다.

## 만들려는 것

Windows 상시 실행 개인용 칸반보드 데스크톱 앱. **동일 데이터**를 두 뷰로 본다.

- **위젯 모드**: 바탕화면 always-on-top 작은 창. 오늘 마감/최근 카드 요약 + 빠른 추가.
- **풀보드 모드**: 컬럼 + 카드 드래그 앤 드롭의 일반 칸반.

1차 목표는 클라우드 동기화 없는 **로컬 저장 전용** 완결 버전. 코르크보드 스킨 없음.

## 목표 구조 (plan.md)

```
src/
  components/board/   풀보드 모드 (컬럼, 카드, dnd)
  components/widget/  위젯 모드
  components/ui/      shadcn/ui
  store/             Zustand 스토어
  lib/               store 플러그인을 감싼 데이터 접근 계층
  types/             Board / Column / Card 타입
src-tauri/
  src/main.rs        창 생성, 트레이, always-on-top
  tauri.conf.json
```

## 데이터 모델

`Card`(id, title, description?, dueDate? ISO, labels[], checklist[{id,text,done}], order)를
`Column`(id, title, cardIds[])이 id로 참조하고, `Board`(id, title, columns[])가 컬럼을 보유.
카드는 id로 저장, 순서는 `Column.cardIds` / `Card.order`로 관리.

## Phase 게이트 (필수)

이전 Phase의 완료 기준을 충족하기 전에는 다음 Phase를 시작하지 않는다.

- **Phase 0** — Tauri React/TS/Vite 템플릿 + Tailwind/shadcn + always-on-top 빈 창 + 트레이 토글. 게이트: 트레이 클릭으로 고정 창 토글.
- **Phase 1** — 타입 + Zustand + `tauri-plugin-store` 로드/자동저장 + 컬럼·카드 CRUD + `@dnd-kit` 순서변경·컬럼간 이동 + 카드 상세 패널. 게이트: 풀보드 모드 단독 완결.
- **Phase 2** — 위젯 창 UI + 위젯↔풀보드 전환(트레이 클릭 + `Ctrl+Alt+K`) + `tauri-plugin-positioner` 위치 기억. 게이트: 한 뷰에서 추가한 카드가 다른 뷰에 즉시 반영.
- **Phase 3** — 위젯의 마감 임박 강조 + `tauri-plugin-autostart` 옵션 + JSON 내보내기/가져오기(로컬 전용의 유일한 백업, 우선순위 높음). 게이트: 재부팅 후 위젯 자동 실행 + 데이터 보존.
- **Phase 4** — Tauri 번들러 `.msi` + 며칠 상시 실행 소크 테스트(메모리 누수, 자동저장 안정성). 게이트: 새 환경 설치 후 정상 동작.

## 세부 규칙

확정 기술 스택, 코딩 컨벤션(주석/식별자 언어 등), 빌드·실행·테스트 명령어, git 커밋
워크플로는 `.claude/rules/`에 주제별 파일로 분리되어 있다 (`tech-stack.md`,
`coding-convention.md`, `commands.md`, `git-workflow.md`). 이 파일들은 세션마다
자동으로 로드되므로 여기서 반복하지 않는다.

## Gemini CLI 설정 감지됨

`~/.gemini/settings.json` 존재. 사용자 레벨 항목(MCP 서버, 슬래시 커맨드, 서브에이전트, 스킬, 지침) 가져오기는 `/import`로 스캔·목록 확인 후 `/import --yes=<digest>`로 적용. 해당 파일을 직접 읽거나 설정을 손으로 쓰지 말 것.
