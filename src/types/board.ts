// 칸반보드 도메인 타입.
// 위젯 모드와 풀보드 모드가 이 동일한 데이터 구조를 공유한다.

// 카드 안의 체크리스트 한 줄.
export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

// 카드 한 장. 저장은 id 기준이고, 표시 순서는 Column.cardIds가 관리한다.
// order는 정렬 보조 필드로, cardIds와 어긋났을 때의 복구용이다.
export interface Card {
  id: string;
  title: string;
  description?: string;
  /** ISO 8601 날짜 문자열 (예: "2026-09-07"). 없으면 마감일 미지정. */
  dueDate?: string;
  labels: string[];
  checklist: ChecklistItem[];
  order: number;
  /** 생성 시각 (ISO 8601). 위젯의 "최근 카드" 정렬에 쓴다. 사용자가 수정할 수 있다. */
  createdAt: string;
  /** '완료' 컬럼으로 옮긴 시각 (ISO 8601). 완료 컬럼 밖으로 나가면 제거된다.
   *  완료 컬럼의 날짜별 그룹은 이 값을 기준으로 묶는다. */
  completedAt?: string;
  /** 카드 개별 배경색 (CSS 색 문자열). 없으면 기본색. */
  color?: string;
}

// 컬럼 한 개. 카드를 id 배열로 참조하며 이 배열 순서가 곧 표시 순서다.
export interface Column {
  id: string;
  title: string;
  cardIds: string[];
}

// 보드 한 개. 1차 버전은 단일 보드만 사용한다.
// 카드 실체는 cards 맵에 id로 저장하고, 컬럼은 cardIds로 참조만 한다.
export interface Board {
  id: string;
  title: string;
  columns: Column[];
  cards: Record<string, Card>;
  /** '완료'로 취급할 컬럼 id. 미지정 시 migrate가 제목이 "완료"인 컬럼을 찾아 채운다. */
  doneColumnId?: string;
}
