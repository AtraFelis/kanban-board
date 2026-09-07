import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/button";

function App() {
  const [greetMsg, setGreetMsg] = useState("");

  // Tauri IPC와 Tailwind/shadcn 렌더링이 함께 동작하는지 확인하는 임시 화면.
  // 다음 단계에서 빈 always-on-top 창으로 교체된다.
  async function greet() {
    setGreetMsg(await invoke("greet", { name: "칸반보드" }));
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">칸반보드</h1>
      <p className="text-sm text-muted-foreground">
        Tauri + React + Tailwind + shadcn/ui 스캐폴딩 확인용 화면
      </p>
      <Button onClick={greet}>Rust greet 호출</Button>
      {greetMsg && <p className="text-sm">{greetMsg}</p>}
    </main>
  );
}

export default App;
