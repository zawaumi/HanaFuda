export default function ProfilePage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Profile</p>
        <h1>プロフィール</h1>
        <p>あなたの情報を管理する場所です。</p>
      </header>
      <section className="surface empty-state">
        <span className="status-chip">準備中</span>
        <h2>プロフィール編集は次の実装で追加します</h2>
      </section>
    </div>
  );
}
