# PC용 칸반보드 앱 — 개발 계획 (plan.md)

이 문서는 Claude Code가 이 저장소에서 실제 구현을 진행할 때 참고하는 작업 계획이다.
제품 기획 배경과 의사결정 근거는 별도 기획서(claude.ai 프로젝트 "PC용 칸반보드"의 `기획서.md`)에
정리되어 있으며, 여기서는 실행에 필요한 스택·구조·단계별 작업만 다룬다.

## 프로젝트 개요

Windows에서 상시 실행하는 개인용 칸반보드 앱이다. 두 가지 뷰를 오간다.

- **위젯 모드**: 바탕화면에 항상 떠 있는 작은 창. 오늘 마감/최근 카드 요약, 빠른 카드 추가.
- **풀보드 모드**: 컬럼 + 카드 드래그 앤 드롭이 가능한 일반 칸반보드.

코르크보드 비주얼 스킨은 넣지 않는다(일반 칸반 UI로 충분). 1차 목표는 클라우드 동기화 없이
로컬 저장만으로 완결된 버전이다.

## 확정 기술 스택

- **프레임워크**: Tauri v2 (Rust는 최소화, 공식 플러그인 위주로 사용)
- **프론트엔드**: React + TypeScript + Vite
- **스타일링**: Tailwind CSS + shadcn/ui
- **드래그 앤 드롭**: @dnd-kit/core, @dnd-kit/sortable
- **상태 관리**: Zustand
- **로컬 저장**: tauri-plugin-store (JSON, `%APPDATA%` 하위) — 추후 필요 시 tauri-plugin-sql(SQLite)로 전환 가능하도록 데이터 접근 계층 분리
- **기타 플러그인**: tauri-plugin-autostart(자동 시작), tauri-plugin-positioner(창 위치 기억)

## 제안 프로젝트 구조

```
kanban-board/
├── src/                      # React 프론트엔드
│   ├── components/
│   │   ├── board/            # 풀보드 모드 (컬럼, 카드, 드래그앤드롭)
│   │   ├── widget/           # 위젯 모드
│   │   └── ui/               # shadcn/ui 컴포넌트
│   ├── store/                # Zustand 스토어
│   ├── lib/                  # 데이터 접근 계층 (store 플러그인 래핑)
│   ├── types/                # Board/Column/Card 타입 정의
│   └── App.tsx
├── src-tauri/                # Tauri(Rust) 백엔드
│   ├── src/
│   │   └── main.rs           # 창 생성, 트레이, always-on-top 설정
│   └── tauri.conf.json
├── plan.md
└── package.json
```

## 데이터 모델 (초안)

```typescript
interface Card {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO date
  labels: string[];
  checklist: { id: string; text: string; done: boolean }[];
  order: number;
}

interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

interface Board {
  id: string;
  title: string;
  columns: Column[];
}
```

## 단계별 작업 목록

### Phase 0 — 환경 셋업 & 위젯 전제 검증
- [ ] `npm create tauri-app@latest`로 React + TypeScript + Vite 템플릿 초기화
- [ ] Tailwind CSS, shadcn/ui 설치 및 기본 설정
- [ ] 빈 창을 always-on-top으로 띄우기 (tauri.conf.json / WindowBuilder)
- [ ] 트레이 아이콘 추가, 클릭 시 창 보이기/숨기기 동작 확인
- [ ] **완료 기준**: 트레이 아이콘 클릭으로 항상 위 고정 창이 토글되는 것을 확인

### Phase 1 — 칸반보드 코어 (풀보드 모드)
- [ ] Board/Column/Card 타입 정의 및 Zustand 스토어 구성
- [ ] tauri-plugin-store 연동, 앱 시작 시 로드 / 변경 시 자동 저장
- [ ] 컬럼·카드 생성/수정/삭제 UI
- [ ] @dnd-kit으로 카드 드래그 앤 드롭 (컬럼 내 순서 변경, 컬럼 간 이동)
- [ ] 카드 상세 패널 (제목/설명/마감일/라벨/체크리스트 편집)
- [ ] **완료 기준**: 풀보드 모드만으로 칸반보드가 독립적으로 완결 동작

### Phase 2 — 위젯 모드
- [ ] 축소된 위젯 창 UI 구현 (오늘 마감/최근 카드 요약, 빠른 추가 입력창)
- [ ] 위젯 ↔ 풀보드 모드 전환 로직 (트레이 클릭 + 단축키 `Ctrl+Alt+K`)
- [ ] tauri-plugin-positioner로 위젯 창 위치 기억
- [ ] 두 모드가 동일 데이터를 실시간 반영하는지 확인
- [ ] **완료 기준**: 위젯에서 추가한 카드가 풀보드에 즉시 반영, 반대도 동일

### Phase 3 — 상시 실행 편의 기능
- [ ] 마감 임박 카드 위젯 강조 표시
- [ ] tauri-plugin-autostart로 Windows 시작 시 자동 실행 옵션
- [ ] 데이터 내보내기/가져오기(JSON 백업) — 로컬 전용 저장의 유일한 안전장치이므로 우선순위 높게
- [ ] **완료 기준**: PC 재부팅 후에도 위젯이 자동으로 뜨고 데이터가 보존됨

### Phase 4 — 패키징 & 배포
- [ ] Tauri 번들러로 Windows 설치 파일(.msi) 빌드
- [ ] 며칠간 상시 실행하며 메모리 누수, 자동 저장 안정성 점검
- [ ] **완료 기준**: 설치 파일로 새 환경에 설치 후 정상 동작 확인

## Claude Code 작업 시 참고사항

- 코드 내 주석과 설명은 한글로 작성하고, 변수명/함수명은 영어로 작성한다.
- 각 Phase는 이전 Phase의 완료 기준을 충족한 뒤 다음으로 넘어가는 것을 원칙으로 한다.
- Rust 쪽에서 막히는 이슈가 반복되면, UI 로직을 프레임워크 독립적으로 유지한 상태이므로
  Electron으로 전환하는 옵션도 열어둔다 (기획서 3장 참고).
- 의존성 추가 시 안정적인 최신 버전인지 확인하고 진행한다.
