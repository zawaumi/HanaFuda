"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { dataSource, isApiError, type GenerateDeckResult } from "@/lib/api";
import { loadDeckDraft, loadDeckResult, saveDeckResult } from "@/lib/deck-flow";
import { SeasonMark, seasonForIndex } from "@/lib/season";
import styles from "./deck-view.module.css";

export function DeckView() {
  const [result, setResult] = useState<GenerateDeckResult | null>(null);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const pending = useRef(false);
  const cardButtons = useRef<(HTMLButtonElement | null)[]>([]);

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
      setSelectedIndex(0);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(isApiError(reason) ? reason.message : "再生成できませんでした。もう一度お試しください。");
    } finally {
      pending.current = false;
      setGenerating(false);
    }
  }

  function onCardKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number, count: number) {
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % count
      : event.key === "ArrowLeft" ? (index - 1 + count) % count : null;
    if (nextIndex === null) return;
    event.preventDefault();
    setSelectedIndex(nextIndex);
    cardButtons.current[nextIndex]?.focus();
  }

  if (!ready) return <p aria-busy="true">デッキを読み込み中…</p>;
  if (!result) return <section className={`${styles.missing} surface`}><h1>デッキがありません</h1><p>会話設定から話題を生成してください。</p><Link className="button button-primary" href="/connections">つながりへ戻る</Link></section>;
  if (result.cards.length === 0) return <section className={`${styles.missing} surface`}><h1>話題がありません</h1><p>もう一度、会話設定から話題を生成してください。</p><Link className="button button-primary" href="/connections">つながりへ戻る</Link></section>;

  const activeIndex = Math.min(selectedIndex, result.cards.length - 1);
  const activeCard = result.cards[activeIndex];
  const activeSeason = seasonForIndex(activeIndex);

  return <div className={styles.page}>
    <h1 className="visually-hidden">会話デッキ</h1>
    <header className={styles.header}>
      <p className={styles.summary}>{result.summary}</p>
      <span className={styles.deckCount}><strong>{String(result.cards.length).padStart(2, "0")}</strong><span>枚のカード</span></span>
    </header>
    <div className={styles.toolbar}><span>{revision}回目 · カードを選んで話題を見る</span><button type="button" onClick={regenerate} disabled={generating}>{generating ? "引き直し中…" : "別の話題を引く"}</button></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.experience} aria-label="会話の話題カード" aria-busy={generating}>
      <div className={styles.stage}>
        <div className={styles.stageCaption}><span>今日のカード</span><span>好きな一枚を選ぶ</span></div>
        <ol className={styles.hand} aria-label="話題カードの一覧">
          {result.cards.map((card, index) => {
            // Lay the hand left to right around its own middle, tightening as it grows.
            const position = index - (result.cards.length - 1) / 2;
            const step = Math.min(118, 480 / Math.max(result.cards.length - 1, 1));
            const season = seasonForIndex(index);
            const cardStyle = {
              "--spread": `${position * step}px`,
              "--tilt": `${position * 6}deg`,
              "--rise": `${Math.abs(position) * 16}px`,
              // Stack left to right so every card keeps its own left edge visible.
              "--order": activeIndex === index ? 20 : index + 1,
              "--delay": `${index * 65}ms`,
              "--suit": season.color,
            } as CSSProperties;
            return <li className={`${styles.handItem} ${activeIndex === index ? styles.selected : ""}`} style={cardStyle} key={`${revision}-${index}`}>
              <button
                ref={(element) => { cardButtons.current[index] = element; }}
                className={styles.handCard}
                type="button"
                aria-pressed={activeIndex === index}
                aria-label={`話題 ${index + 1}: ${card.topic} を表示`}
                onClick={() => setSelectedIndex(index)}
                onKeyDown={(event) => onCardKeyDown(event, index, result.cards.length)}
              >
                <span className={styles.cardFrame} aria-hidden="true" />
                <span className={styles.cardTop}>
                  <span className={styles.cardMark} aria-hidden="true"><SeasonMark season={season} /></span>
                  {index === 0 && <span className={styles.cardPick}>おすすめ</span>}
                </span>
                <span className={styles.cardBody}>
                  <strong>{card.topic}</strong>
                  <span className={styles.cardPreview}>{card.starter}</span>
                </span>
                <span className={styles.cardFoot} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              </button>
            </li>;
          })}
        </ol>
        <p className={styles.stageHint}><span className={styles.desktopHint}>← → キーでもカードを選べます</span><span className={styles.mobileHint}>横にスワイプして、カードを選ぶ</span></p>
      </div>
      <article className={styles.detail} key={`${revision}-${activeIndex}`} style={{ "--suit": activeSeason.color } as CSSProperties}>
        <div className={styles.detailTop}>
          <span className={styles.detailSuit}>
            <span className={styles.detailSuitMark} aria-hidden="true"><SeasonMark season={activeSeason} /></span>
            <span>選んだ話題</span>
          </span>
          <span>{String(activeIndex + 1).padStart(2, "0")} / {String(result.cards.length).padStart(2, "0")}</span>
        </div>
        <p className={styles.detailEyebrow}>{activeIndex === 0 ? "最初のおすすめ" : "ほかの話題"}</p>
        <h2>{activeCard.topic}</h2>
        <p className={styles.starter}>「{activeCard.starter}」</p>
        <div className={styles.detailExtras}>
          <details><summary>返答に合わせた続け方</summary><ul>{activeCard.branches.map((branch, branchIndex) => <li key={branchIndex}><strong>{branch.condition}</strong><p>{branch.next}</p></li>)}</ul></details>
          <details><summary>この話題をおすすめする理由</summary><p>{activeCard.reason}</p></details>
        </div>
      </article>
    </section>
    <p className={styles.selectionNotice} aria-live="polite">話題 {activeIndex + 1}: {activeCard.topic} を選択中</p>
    <div className={styles.footer}><Link className="button button-primary" href="/deck/session/feedback">会話後の記録へ進む <span aria-hidden="true">↗</span></Link></div>
  </div>;
}
