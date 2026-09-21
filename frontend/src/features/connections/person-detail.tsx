"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dataSource,
  isApiError,
  type Conversation,
  type Person,
  type PersonMemory,
} from "@/lib/api";
import styles from "./person-detail.module.css";

type DetailState =
  | { status: "loading" }
  | {
      status: "ready";
      person: Person;
      conversations: Conversation[];
      memories: PersonMemory[];
    }
  | { status: "not-found" }
  | { status: "error"; message: string };

async function fetchPersonDetail(personId: string) {
  const [person, conversations, memories] = await Promise.all([
    dataSource.getPerson(personId),
    dataSource.getConversations({ personId }),
    dataSource.getPersonMemories(personId),
  ]);
  return {
    person,
    conversations: conversations.sort((left, right) =>
      right.created_at.localeCompare(left.created_at),
    ),
    memories: memories.sort((left, right) =>
      right.created_at.localeCompare(left.created_at),
    ),
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function ratingLabel(rating: Conversation["rating"]) {
  if (rating === "good") return "よかった";
  if (rating === "normal") return "ふつう";
  if (rating === "poor") return "難しかった";
  return "未評価";
}

function loadErrorState(error: unknown): DetailState {
  if (isApiError(error) && error.kind === "not_found") {
    return { status: "not-found" };
  }
  return {
    status: "error",
    message: isApiError(error)
      ? error.message
      : "相手の情報を読み込めませんでした。時間をおいて再度お試しください。",
  };
}

export function PersonDetail({ personId }: { personId: string }) {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState<DetailState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void fetchPersonDetail(personId)
      .then((result) => {
        if (!cancelled) setState({ status: "ready", ...result });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState(loadErrorState(error));
      });
    return () => {
      cancelled = true;
    };
  }, [personId, reloadToken]);

  function retry() {
    setState({ status: "loading" });
    setReloadToken((current) => current + 1);
  }

  if (state.status === "loading") return <DetailLoading />;
  if (state.status === "not-found") return <PersonNotFound />;
  if (state.status === "error") {
    return (
      <StatusCard
        title="読み込みに失敗しました"
        description={state.message}
        action={<button onClick={retry}>もう一度試す</button>}
        alert
      />
    );
  }

  const latestConversation = state.conversations[0];

  return (
    <div className={styles.page}>
      <Link className={styles.backLink} href="/connections">
        <span aria-hidden="true">‹</span> つながりへ戻る
      </Link>

      <header className={`${styles.profileHeader} surface`}>
        <span className={styles.avatar} aria-hidden="true">
          {state.person.name.slice(0, 1)}
        </span>
        <div className={styles.profileText}>
          <p className="eyebrow">Connection</p>
          <h1>{state.person.name}</h1>
          <span className={styles.relationship}>{state.person.relationship}</span>
        </div>
        <Link
          className="button button-primary"
          href={`/connections/${state.person.id}/deck/new`}
        >
          次の話題を準備 <span aria-hidden="true">›</span>
        </Link>
      </header>

      <div className={styles.detailGrid}>
        <section className={`${styles.panel} surface`} aria-labelledby="known-info">
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon} aria-hidden="true">i</span>
            <div>
              <p>PROFILE</p>
              <h2 id="known-info">知っていること</h2>
            </div>
          </div>
          {state.person.known_information ? (
            <p className={styles.bodyText}>{state.person.known_information}</p>
          ) : (
            <EmptyText>まだ情報がありません。次の会話後に追加できます。</EmptyText>
          )}
          <div className={styles.tags} aria-label="関係タグ">
            <span>{state.person.relationship}</span>
          </div>
        </section>

        <section className={`${styles.panel} surface`} aria-labelledby="memories">
          <div className={styles.panelHeading}>
            <span className={styles.panelIcon} aria-hidden="true">✦</span>
            <div>
              <p>MEMORY</p>
              <h2 id="memories">会話から覚えたこと</h2>
            </div>
          </div>
          {state.memories.length > 0 ? (
            <ul className={styles.memoryList}>
              {state.memories.map((memory) => (
                <li key={memory.id}>
                  <span aria-hidden="true" />
                  <div>
                    <p>{memory.content}</p>
                    <time dateTime={memory.created_at}>{formatDate(memory.created_at)}</time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyText>確認済みの記憶はまだありません。</EmptyText>
          )}
        </section>
      </div>

      <section className={`${styles.conversationPanel} surface`} aria-labelledby="latest-conversation">
        <div className={styles.panelHeading}>
          <span className={styles.panelIcon} aria-hidden="true">↺</span>
          <div>
            <p>RECENT CONVERSATION</p>
            <h2 id="latest-conversation">直近の会話</h2>
          </div>
        </div>
        {latestConversation ? (
          <div className={styles.conversationBody}>
            <div className={styles.conversationMeta}>
              <time dateTime={latestConversation.created_at}>
                {formatDate(latestConversation.created_at)}
              </time>
              <span>{ratingLabel(latestConversation.rating)}</span>
            </div>
            <dl>
              <div>
                <dt>目的</dt>
                <dd>{latestConversation.purpose || "記録なし"}</dd>
              </div>
              <div>
                <dt>状況</dt>
                <dd>{latestConversation.situation || "記録なし"}</dd>
              </div>
              <div>
                <dt>メモ</dt>
                <dd>{latestConversation.memo || "記録なし"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyText>会話履歴はまだありません。最初の話題を準備しましょう。</EmptyText>
        )}
      </section>
    </div>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className={styles.emptyText}>{children}</p>;
}

function DetailLoading() {
  return (
    <div className={styles.loading} aria-busy="true" aria-label="読み込み中">
      <div className={`${styles.loadingHeader} surface`} />
      <div className={styles.detailGrid}>
        <div className={`${styles.loadingPanel} surface`} />
        <div className={`${styles.loadingPanel} surface`} />
      </div>
      <div className={`${styles.loadingPanel} surface`} />
    </div>
  );
}

function PersonNotFound() {
  return (
    <StatusCard
      title="相手が見つかりません"
      description="削除されたか、URLが間違っている可能性があります。"
      action={<Link href="/connections">つながり一覧へ戻る</Link>}
    />
  );
}

function StatusCard({
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
    <div className={styles.statusPage} role={alert ? "alert" : undefined}>
      <section className={`${styles.statusCard} surface`}>
        <p className="eyebrow">Connection</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div>{action}</div>
      </section>
    </div>
  );
}
