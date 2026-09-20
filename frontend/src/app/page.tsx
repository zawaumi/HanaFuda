import Link from "next/link";

export default function Home() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Home</p>
        <h1>次の会話を、少し気楽に。</h1>
        <p>
          会う相手を選ぶと、関係やこれまでの会話に合った話題を準備します。
        </p>
      </header>

      <section className="surface empty-state" aria-labelledby="next-conversation">
        <span className="status-chip">今日の準備</span>
        <div>
          <h2 id="next-conversation">まず、話す相手を選びましょう</h2>
          <p>登録済みの相手から、次の会話デッキを作れます。</p>
        </div>
        <Link className="button button-primary" href="/connections">
          つながりを見る
          <span aria-hidden="true">›</span>
        </Link>
      </section>
    </div>
  );
}
