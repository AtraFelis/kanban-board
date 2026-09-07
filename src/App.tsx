// Phase 0: 빈 always-on-top 창. 풀보드 UI는 Phase 1에서 채운다.
function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-xl font-semibold">칸반보드</h1>
      <p className="text-sm text-muted-foreground">
        트레이 아이콘을 클릭하면 이 창이 토글됩니다.
      </p>
    </main>
  );
}

export default App;
