import { load, type Store } from "@tauri-apps/plugin-store";

import type { Board } from "@/types";

// 보드 데이터 영속화 계층.
// 컴포넌트와 스토어는 이 모듈의 loadBoard / saveBoard만 사용한다.
// 나중에 tauri-plugin-sql(SQLite)로 바꾸더라도 이 파일만 교체하면 된다.

const STORE_FILE = "board.json";
const BOARD_KEY = "board";

// tauri-plugin-store 핸들은 한 번만 로드해 재사용한다.
let storePromise: Promise<Store> | null = null;

function getStore(): Promise<Store> {
  if (!storePromise) {
    storePromise = load(STORE_FILE);
  }
  return storePromise;
}

// 저장된 보드를 반환한다. 저장된 적이 없으면 null.
export async function loadBoard(): Promise<Board | null> {
  const store = await getStore();
  const board = await store.get<Board>(BOARD_KEY);
  return board ?? null;
}

// 보드 전체를 저장하고 즉시 디스크에 flush 한다.
export async function saveBoard(board: Board): Promise<void> {
  const store = await getStore();
  await store.set(BOARD_KEY, board);
  await store.save();
}
