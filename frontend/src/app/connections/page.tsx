export default function ConnectionsPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Connections</p>
        <h1>つながり</h1>
        <p>会話したい相手を選ぶ場所です。</p>
      </header>
      <section className="surface empty-state">
        <span className="status-chip">準備中</span>
        <h2>つながり機能は次の実装で追加します</h2>
        <p>この画面では、相手の一覧と会話準備への導線を提供する予定です。</p>
      </section>
    </div>
  );
}
