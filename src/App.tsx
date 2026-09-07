import { BoardView } from "@/components/board/BoardView";
import { WidgetView } from "@/components/widget/WidgetView";

// 창 label별로 다른 URL(?view=widget)을 로드하므로 쿼리로 뷰를 고른다.
const view = new URLSearchParams(window.location.search).get("view");

function App() {
  return view === "widget" ? <WidgetView /> : <BoardView />;
}

export default App;
