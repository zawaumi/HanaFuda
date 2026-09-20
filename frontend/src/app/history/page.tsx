export default function HistoryPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">History</p>
        <h1>会話履歴</h1>
        <p>これまでの会話を振り返る場所です。</p>
      </header>
      <section className="surface empty-state">
        <span className="status-chip">準備中</span>
        <h2>履歴機能は次の実装で追加します</h2>
        <p>この画面では、過去の会話と振り返りを確認できる予定です。</p>
      </section>
    </div>
  );
}
