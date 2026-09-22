"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { dataSource, isApiError, type GenerateDeckInput, type GenerateDeckResult } from "@/lib/api";
import { loadDeckDraft, saveDeckResult } from "@/lib/deck-flow";
import styles from "./deck-generating.module.css";

type GenerationState = "loading" | "timeout" | "error" | "missing";

export function DeckGenerating() {
  const router = useRouter();
  const request = useRef<Promise<GenerateDeckResult> | null>(null);
  const [state, setState] = useState<GenerationState>("loading");
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<GenerateDeckInput | null>(null);

  useEffect(() => {
    let active = true;
    const input = loadDeckDraft();
    if (!input) {
      queueMicrotask(() => { if (active) setState("missing"); });
      return () => { active = false; };
    }
    queueMicrotask(() => { if (active) setDraft(input); });
    request.current ??= dataSource.generateDeck(input);
    void request.current.then((result) => {
      if (!active) return;
      saveDeckResult(result);
      router.replace("/deck/session");
    }).catch((error: unknown) => {
      if (!active) return;
      setState(isApiError(error) && error.kind === "timeout" ? "timeout" : "error");
      setMessage(isApiError(error) ? error.message : "話題を生成できませんでした。");
    });
    return () => { active = false; };
  }, [router]);

  function retry() {
    const input = loadDeckDraft();
    if (!input) { setState("missing"); return; }
    setState("loading");
    setMessage("");
    request.current = dataSource.generateDeck(input);
    void request.current.then((result) => {
      saveDeckResult(result);
      router.replace("/deck/session");
    }).catch((error: unknown) => {
      setState(isApiError(error) && error.kind === "timeout" ? "timeout" : "error");
      setMessage(isApiError(error) ? error.message : "話題を生成できませんでした。");
    });
  }

  const backHref = draft?.person ? `/connections/${draft.person.id}/deck/new?resume=1` : "/connections";

  return <section className={`${styles.panel} surface`} aria-live="polite">
    {state === "loading" ? <>
      <span className={styles.dealer} aria-hidden="true">
        {[0, 1, 2, 3].map((offset) => (
          <span className={styles.dealerCard} key={offset} style={{ "--index": offset } as CSSProperties} />
        ))}
      </span>
      <h1>札を配っています</h1>
      <p>相手の情報と会話の状況をもとに、話し始めやすい話題を考えています。</p>
      <p className={styles.hint}>少しお待ちください。生成中の再送信はできません。</p>
    </> : <>
      <h1>{state === "missing" ? "会話設定が見つかりません" : state === "timeout" ? "時間内に生成できませんでした" : "話題を生成できませんでした"}</h1>
      <p role="alert">{state === "missing" ? "会話設定からもう一度始めてください。" : message}</p>
      <div className={styles.actions}>
        {state !== "missing" && <button className="button button-primary" type="button" onClick={retry}>同じ内容で再試行</button>}
        <Link href={backHref}>会話設定へ戻る</Link>
      </div>
    </>}
  </section>;
}
