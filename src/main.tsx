import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

// 위젯 창은 투명 배경이어야 하므로 body에 클래스를 붙인다 (첫 페인트 전에).
if (new URLSearchParams(window.location.search).get("view") === "widget") {
  document.body.classList.add("widget-window");
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
