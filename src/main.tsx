import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

const isWidget =
  new URLSearchParams(window.location.search).get("view") === "widget";

// 위젯 창은 투명 배경이어야 하므로 body에 클래스를 붙인다 (첫 페인트 전에).
if (isWidget) {
  document.body.classList.add("widget-window");
}

// 브라우저 기본 우클릭 메뉴(뒤로/새로고침/검사 등)를 숨긴다.
// 입력 요소에서는 복사·붙여넣기 메뉴를 위해 그대로 둔다.
// 컬럼/카드의 우클릭 메뉴는 Radix가 각자 preventDefault + 자체 UI를 띄우므로 영향 없다.
window.addEventListener("contextmenu", (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea")) return;
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
