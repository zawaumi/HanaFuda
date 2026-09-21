"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { dataSource, isApiError, type GenerateDeckResult } from "@/lib/api";
import { loadDeckDraft, loadDeckResult, saveDeckResult } from "@/lib/deck-flow";
import styles from "./deck-view.module.css";

export function DeckView() {
  const [result, setResult] = useState<GenerateDeckResult | null>(null);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(1);
  const pending = useRef(false);

  useEffect(() => {
    queueMicrotask(() => { setResult(loadDeckResult()); setReady(true); });
  }, []);

  async function regenerate() {
    if (pending.current) return;
    const input = loadDeckDraft();
    if (!input) { setError("会話設定が見つかりません。設定からやり直してください。"); return; }
    pending.current = true;
    setGenerating(true);
    setError("");
    try {
      const next = await dataSource.generateDeck(input);
      saveDeckResult(next);
      setResult(next);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(isApiError(reason) ? reason.message : "再生成できませんでした。もう一度お試しください。");
    } finally {
      pending.current = false;
      setGenerating(false);
    }
  }

  if (!ready) return <p aria-busy="true">デッキを読み込み中…</p>;
  if (!result) return <section className={`${styles.missing} surface`}><h1>デッキがありません</h1><p>会話設定から話題を生成してください。</p><Link className="button button-primary" href="/connections">つながりへ戻る</Link></section>;

  return <div className={styles.page}>
    <header className="page-header"><p className="eyebrow">Conversation deck</p><h1>会話デッキ</h1><p>{result.summary}</p></header>
    <div className={styles.toolbar}><span>{result.cards.length}枚の話題 · {revision}回目の生成</span><button type="button" onClick={regenerate} disabled={generating}>{generating ? "再生成中…" : "別の話題で再生成"}</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <ol className={styles.cards} aria-busy={generating}>
      {result.cards.map((card, index) => <li className={`${styles.card} ${index === 0 ? styles.featured : ""} surface`} key={`${revision}-${index}`}>
        <div className={styles.cardTop}><span>話題 {index + 1}</span>{index === 0 && <strong>いちばん自然</strong>}</div>
        <h2>{card.topic}</h2>
        <p className={styles.starter}>「{card.starter}」</p>
        <details><summary>返答に合わせた続け方</summary><ul>{card.branches.map((branch, branchIndex) => <li key={branchIndex}><strong>{branch.condition}</strong><p>{branch.next}</p></li>)}</ul></details>
        <details className={styles.reason}><summary>この話題をおすすめする理由</summary><p>{card.reason}</p></details>
      </li>)}
    </ol>
    <Link className="button button-primary" href="/deck/session/feedback">会話後の記録へ進む</Link>
  </div>;
}
