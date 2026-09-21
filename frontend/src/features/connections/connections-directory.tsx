"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dataSource, isApiError, type Person } from "@/lib/api";
import styles from "./connections-directory.module.css";

type DirectoryState =
  | { status: "loading" }
  | { status: "ready"; persons: Person[] }
  | { status: "error"; message: string };

function errorMessage(error: unknown) {
  return isApiError(error)
    ? error.message
    : "つながりを読み込めませんでした。時間をおいて再度お試しください。";
}

export function ConnectionsDirectory() {
  const [query, setQuery] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<DirectoryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void dataSource
        .getPersons({ search: query })
        .then((persons) => {
          if (!cancelled) setState({ status: "ready", persons });
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setState({ status: "error", message: errorMessage(error) });
          }
        });
    }, query ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, reloadToken]);

  function updateQuery(value: string) {
    setQuery(value);
    setState({ status: "loading" });
  }

  function retry() {
    setState({ status: "loading" });
    setReloadToken((current) => current + 1);
  }

  const normalizedQuery = query.trim();

  return (
    <div className={styles.directory}>
      <header className={styles.header}>
        <div className="page-header">
          <p className="eyebrow">Connections</p>
          <h1>つながり</h1>
          <p>登録した相手を探して、次の会話を準備できます。</p>
        </div>
        <Link className="button button-primary" href="/connections/new">
          新しい相手を登録
          <span aria-hidden="true">＋</span>
        </Link>
      </header>

      <section className={styles.searchPanel} aria-labelledby="person-search">
        <label id="person-search" htmlFor="connection-query">
          相手を検索
        </label>
        <div className={styles.searchField}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            id="connection-query"
            type="search"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="名前・関係・メモで検索"
            autoComplete="off"
          />
          {query ? (
            <button type="button" onClick={() => updateQuery("")}>
              クリア
            </button>
          ) : null}
        </div>
      </section>

      <section className={styles.results} aria-labelledby="connections-list">
        <div className={styles.resultsHeading}>
          <h2 id="connections-list">
            {normalizedQuery ? `「${normalizedQuery}」の検索結果` : "登録済みの相手"}
          </h2>
          {state.status === "ready" ? (
            <span aria-live="polite">{state.persons.length}人</span>
          ) : null}
        </div>

        {state.status === "loading" ? <DirectoryLoading /> : null}

        {state.status === "error" ? (
          <DirectoryMessage
            title="読み込みに失敗しました"
            description={state.message}
            action={
              <button type="button" onClick={retry}>
                もう一度試す
              </button>
            }
            alert
          />
        ) : null}

        {state.status === "ready" && state.persons.length === 0 ? (
          normalizedQuery ? (
            <DirectoryMessage
              title="一致する相手がいません"
              description="検索語を短くするか、別の言葉でお試しください。"
              action={
                <button type="button" onClick={() => updateQuery("")}>
                  検索をクリア
                </button>
              }
            />
          ) : (
            <DirectoryMessage
              title="まだ相手が登録されていません"
              description="最初の相手を登録すると、ここから会話を準備できます。"
              action={<Link href="/connections/new">相手を登録する</Link>}
            />
          )
        ) : null}

        {state.status === "ready" && state.persons.length > 0 ? (
          <ul className={styles.personList}>
            {state.persons.map((person) => (
              <li className={`${styles.personCard} surface`} key={person.id}>
                <div className={styles.personSummary}>
                  <span className={styles.avatar} aria-hidden="true">
                    {person.name.slice(0, 1)}
                  </span>
                  <div>
                    <h3>{person.name}</h3>
                    <p className={styles.relationship}>{person.relationship}</p>
                    <p className={styles.note}>{person.known_information}</p>
                  </div>
                </div>
                <div className={styles.actions}>
                  <Link className={styles.detailLink} href={`/connections/${person.id}`}>
                    詳細を見る
                  </Link>
                  <Link
                    className={styles.prepareLink}
                    href={`/connections/${person.id}/deck/new`}
                  >
                    話題を準備 <span aria-hidden="true">›</span>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function DirectoryLoading() {
  return (
    <div className={styles.personList} aria-busy="true" aria-label="読み込み中">
      {[0, 1, 2].map((item) => (
        <div className={`${styles.personCard} ${styles.skeleton} surface`} key={item}>
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function DirectoryMessage({
  title,
  description,
  action,
  alert = false,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <div className={`${styles.message} surface`} role={alert ? "alert" : undefined}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.messageAction}>{action}</div>
    </div>
  );
}
